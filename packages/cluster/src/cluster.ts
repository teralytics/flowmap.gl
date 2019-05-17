/*
 * Copyright 2019 Teralytics
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

/**
 * The code in this file is a based on https://github.com/mapbox/supercluster
 */

// ISC License
//
// Copyright (c) 2016, Mapbox
//
// Permission to use, copy, modify, and/or distribute this software for any purpose
// with or without fee is hereby granted, provided that the above copyright notice
// and this permission notice appear in all copies.
//
// THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
// REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
// FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
// INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
// OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
// TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
// THIS SOFTWARE.

import { Location, LocationAccessors } from '@flowmap.gl/core';
import { rollup } from 'd3-array';
import KDBush from 'kdbush';
import { LocationWeightGetter } from './ClusterIndex';
import { Cluster, ClusterLevel, ClusterNode } from './types';

export interface Options {
  minZoom: number; // min zoom to generate clusters on
  maxZoom: number; // max zoom level to cluster the points on
  radius: number; // cluster radius in pixels
  extent: number; // tile extent (radius is calculated relative to it)
  nodeSize: number; // size of the KD-tree leaf node, affects performance
  makeClusterName: (id: number, numPoints: number) => string;
  makeClusterId: (id: number) => string;
}

const defaultOptions: Options = {
  minZoom: 0,
  maxZoom: 16,
  radius: 40,
  extent: 512,
  nodeSize: 64,
  makeClusterName: (id: number, numPoints: number) => `Cluster #${id} of ${numPoints} locations`,
  makeClusterId: (id: number) => `{[${id}]}`,
};

interface BasePoint {
  x: number; // projected point coordinates
  y: number;
  weight: number;
  zoom: number; // the last zoom the point was processed at
  parentId: number; // parent cluster id
}

interface LeafPoint extends BasePoint {
  index: number; // index of the source feature in the original input array,
}

interface ClusterPoint extends BasePoint {
  id: number;
  numPoints: number;
}

type Point = LeafPoint | ClusterPoint;

export function isLeafPoint(p: Point): p is LeafPoint {
  const { index } = p as LeafPoint;
  return index != null;
}

export function isClusterPoint(p: Point): p is ClusterPoint {
  const { id } = p as ClusterPoint;
  return id != null;
}

type ZoomLevelKDBush = any;

export function clusterLocations(
  locations: Location[],
  locationAccessors: LocationAccessors,
  getLocationWeight: LocationWeightGetter,
  options?: Partial<Options>,
): ClusterLevel[] {
  const { getLocationCentroid, getLocationId } = locationAccessors;
  const opts = {
    ...defaultOptions,
    ...options,
  };
  const { minZoom, maxZoom, nodeSize, makeClusterName, makeClusterId } = opts;

  const trees = new Array<ZoomLevelKDBush>(maxZoom + 1);

  // generate a cluster object for each point and index input points into a KD-tree
  let clusters = new Array<Point>();
  for (let i = 0; i < locations.length; i++) {
    const [x, y] = getLocationCentroid(locations[i]);
    clusters.push({
      x: lngX(x), // projected point coordinates
      y: latY(y),
      weight: getLocationWeight(locations[i]),
      zoom: Infinity, // the last zoom the point was processed at
      index: i, // index of the source feature in the original input array,
      parentId: -1, // parent cluster id
    });
  }
  trees[maxZoom + 1] = new KDBush(clusters, getX, getY, nodeSize, Float32Array);

  // cluster points on max zoom, then cluster the results on previous zoom, etc.;
  // results in a cluster hierarchy across zoom levels
  for (let z = maxZoom; z >= minZoom; z--) {
    // create a new set of clusters for the zoom and index them with a KD-tree
    clusters = cluster(clusters, z, trees[z + 1], opts);
    trees[z] = new KDBush(clusters, getX, getY, nodeSize, Float32Array);
  }

  if (trees.length === 0) {
    return [];
  }
  const numbersOfClusters = trees.map(d => d.points.length);
  const maxAvailZoom = numbersOfClusters.indexOf(numbersOfClusters[numbersOfClusters.length - 1]);
  const minAvailZoom = Math.min(maxAvailZoom, numbersOfClusters.lastIndexOf(numbersOfClusters[0]));

  const clusterLevels = new Array<ClusterLevel>();
  for (let zoom = minAvailZoom; zoom <= maxAvailZoom; zoom++) {
    let childrenByParent: Map<number, string[]> | undefined;
    const tree = trees[zoom];
    if (zoom < maxAvailZoom) {
      childrenByParent = rollup<Point, number, string[]>(
        trees[zoom + 1].points,
        (points: any[]) => points.map((p: any) => (p.id ? makeClusterId(p.id) : getLocationId(locations[p.index]))),
        (point: any) => point.parentId,
      );
    }

    const nodes = new Array<ClusterNode>();
    for (const point of tree.points) {
      const { x, y, numPoints } = point;
      if (isLeafPoint(point)) {
        const location = locations[point.index];
        nodes.push({
          id: getLocationId(location),
          zoom,
          centroid: getLocationCentroid(location),
        });
      } else if (isClusterPoint(point)) {
        const { id } = point;
        const children = childrenByParent && childrenByParent.get(id);
        if (!children) {
          throw new Error(`Cluster ${id} doesn't have children`);
        }
        const cluster: Cluster = {
          id: makeClusterId(id),
          name: makeClusterName(id, numPoints),
          zoom,
          centroid: [xLng(x), yLat(y)] as [number, number],
          children,
        };
        nodes.push(cluster);
      }
    }
    clusterLevels.push({
      zoom,
      nodes,
    });
  }
  return clusterLevels;
}

function createCluster(x: number, y: number, id: number, numPoints: number, weight: number): ClusterPoint {
  return {
    x, // weighted cluster center
    y,
    zoom: Infinity, // the last zoom the cluster was processed at
    id, // encodes index of the first child of the cluster and its zoom level
    parentId: -1, // parent cluster id
    numPoints,
    weight,
  };
}

function cluster(points: Point[], zoom: number, tree: ZoomLevelKDBush, options: Options) {
  const clusters = new Array<Point>();
  const { radius, extent } = options;
  const r = radius / (extent * Math.pow(2, zoom));

  // loop through each point
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    // if we've already visited the point at this zoom level, skip it
    if (p.zoom <= zoom) {
      continue;
    }
    p.zoom = zoom;

    // find all nearby points
    const neighborIds = tree.within(p.x, p.y, r);

    let weight = p.weight || 1;
    let numPoints = isClusterPoint(p) ? p.numPoints : 1;
    let wx = p.x * weight;
    let wy = p.y * weight;

    // encode both zoom and point index on which the cluster originated
    const id = (i << 5) + (zoom + 1);

    for (const neighborId of neighborIds) {
      const b = tree.points[neighborId];
      // filter out neighbors that are already processed
      if (b.zoom <= zoom) {
        continue;
      }
      b.zoom = zoom; // save the zoom (so it doesn't get processed twice)

      const weight2 = b.weight || 1;
      const numPoints2 = b.numPoints || 1;
      wx += b.x * weight2; // accumulate coordinates for calculating weighted center
      wy += b.y * weight2;

      weight += weight2;
      numPoints += numPoints2;
      b.parentId = id;
    }

    if (numPoints === 1) {
      clusters.push(p);
    } else {
      p.parentId = id;
      clusters.push(createCluster(wx / weight, wy / weight, id, numPoints, weight));
    }
  }

  return clusters;
}

// spherical mercator to longitude/latitude
function xLng(x: number) {
  return (x - 0.5) * 360;
}

function yLat(y: number) {
  const y2 = ((180 - y * 360) * Math.PI) / 180;
  return (360 * Math.atan(Math.exp(y2))) / Math.PI - 90;
}

// longitude/latitude to spherical mercator in [0..1] range
function lngX(lng: number) {
  return lng / 360 + 0.5;
}

function latY(lat: number) {
  const sin = Math.sin((lat * Math.PI) / 180);
  const y = 0.5 - (0.25 * Math.log((1 + sin) / (1 - sin))) / Math.PI;
  return y < 0 ? 0 : y > 1 ? 1 : y;
}

function getX(p: Point) {
  return p.x;
}

function getY(p: Point) {
  return p.y;
}
