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

import { Flow, FlowAccessors, Location, LocationAccessors } from '@flowmap.gl/core';
import { ascending, bisectLeft, extent, rollup } from 'd3-array';
import Supercluster from 'supercluster';
import { AggregateFlow, Cluster, isCluster } from './types';

const CLUSTER_ID_PREFIX = '__cluster::';
const DEFAULT_MAX_CLUSTER_ZOOM = 18;

export const makeClusterId = (id: string | number) => `${CLUSTER_ID_PREFIX}${id}`;

export type ClusterNode = Location | Cluster;
export type FlowItem = Flow | AggregateFlow;
export type LocationWeightGetter = (id: string) => number;

export interface ClusterIndex {
  availableZoomLevels: number[];
  getClusterNodesFor: (zoom: number | undefined) => ClusterNode[] | undefined;
  getClusterNodeId: (node: ClusterNode) => string;
  getClusterById: (clusterId: string) => Cluster | undefined;
  /**
   * Returns the min zoom level on which the location is not clustered
   */
  getMinZoomForLocation: (locationId: string) => number;
  expandCluster: (cluster: Cluster, targetZoom?: number) => string[];
  findClusterFor: (locationId: string, zoom: number) => string | undefined;
  aggregateFlows: (
    flows: Flow[],
    zoom: number,
    { getFlowOriginId, getFlowDestId, getFlowMagnitude }: FlowAccessors,
  ) => FlowItem[];
}

export interface ClusterLevel {
  zoom: number;
  nodes: ClusterNode[];
}

export function clusterLocations(
  locations: Location[],
  locationAccessors: LocationAccessors,
  getLocationWeight: LocationWeightGetter,
  makeClusterName: (id: string, numPoints: number) => string,
  maxClusterZoom: number = DEFAULT_MAX_CLUSTER_ZOOM,
): ClusterLevel[] {
  const { getLocationCentroid, getLocationId } = locationAccessors;
  const supercluster = new Supercluster({
    radius: 40,
    maxZoom: maxClusterZoom,
  });

  supercluster.load(
    locations.map(location => ({
      type: 'Feature' as 'Feature',
      properties: {
        location,
        weight: getLocationWeight(getLocationId(location)),
      },
      geometry: {
        type: 'Point' as 'Point',
        coordinates: getLocationCentroid(location),
      },
    })),
  );

  const trees: any[] = (supercluster as any).trees;
  if (trees.length === 0) {
    return [];
  }
  const numbersOfClusters = trees.map(d => d.points.length);
  const maxZoom = numbersOfClusters.indexOf(numbersOfClusters[numbersOfClusters.length - 1]);
  const minZoom = Math.min(maxZoom, numbersOfClusters.lastIndexOf(numbersOfClusters[0]));

  const clusterLevels = new Array<ClusterLevel>();
  for (let zoom = minZoom; zoom <= maxZoom; zoom++) {
    let childrenByParent: Map<string, string[]> | undefined;
    const tree = trees[zoom];
    if (zoom < maxZoom) {
      childrenByParent = rollup<any[], string, string[]>(
        trees[zoom + 1].points,
        (points: any[]) => points.map((p: any) => (p.id ? makeClusterId(p.id) : getLocationId(locations[p.index]))),
        (point: any) => point.parentId,
      );
    }

    let nodes: ClusterNode[];
    if (tree.points.length === locations.length) {
      nodes = locations;
    } else {
      nodes = [];
      for (const point of tree.points) {
        const { id, x, y, index, numPoints } = point;
        if (id === undefined) {
          const location = locations[index];
          nodes.push(location);
        } else {
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
    }
    clusterLevels.push({
      zoom,
      nodes,
    });
  }
  return clusterLevels;
}

export function getLocationWeightGetter(
  flows: Flow[],
  { getFlowOriginId, getFlowDestId, getFlowMagnitude }: FlowAccessors,
) {
  const locationTotals = {
    incoming: new Map<string, number>(),
    outgoing: new Map<string, number>(),
  };
  for (const flow of flows) {
    const origin = getFlowOriginId(flow);
    const dest = getFlowDestId(flow);
    const count = getFlowMagnitude(flow);
    locationTotals.incoming.set(dest, (locationTotals.incoming.get(dest) || 0) + count);
    locationTotals.outgoing.set(origin, (locationTotals.outgoing.get(dest) || 0) + count);
  }

  return (id: string) =>
    Math.max(Math.abs(locationTotals.incoming.get(id) || 0), Math.abs(locationTotals.outgoing.get(id) || 0));
}

/**
 * @param clusterLevels Must be sorted by zoom in ascending order
 * @param locations
 * @param locationAccessors
 */
export function buildIndex(
  clusterLevels: ClusterLevel[],
  locations: Location[],
  locationAccessors: LocationAccessors,
): ClusterIndex {
  const { getLocationId } = locationAccessors;
  const nodesByZoom = new Map<number, ClusterNode[]>();
  const clustersById = new Map<string, Cluster>();
  const minZoomByLocationId = new Map<string, number>();
  for (const { zoom, nodes } of clusterLevels) {
    nodesByZoom.set(zoom, nodes);
    for (const node of nodes) {
      if (isCluster(node)) {
        clustersById.set(node.id, node);
      } else {
        const id = getLocationId(node);
        const mz = minZoomByLocationId.get(id);
        if (mz != null && mz > zoom) {
          minZoomByLocationId.set(id, zoom);
        }
      }
    }
  }

  const [minZoom, maxZoom] = extent(clusterLevels, cl => cl.zoom);
  if (minZoom == null || maxZoom == null) {
    throw new Error('Could not determine minZoom or maxZoom');
  }

  const leavesToClustersByZoom = new Map<number, Map<string, Cluster>>();

  for (const cluster of clustersById.values()) {
    const { zoom } = cluster;
    let leavesToClusters = leavesToClustersByZoom.get(zoom);
    if (!leavesToClusters) {
      leavesToClusters = new Map<string, ClusterNode>();
      leavesToClustersByZoom.set(zoom, leavesToClusters);
    }
    visitClusterLeaves(cluster, leafId => {
      leavesToClusters!.set(leafId, cluster);
    });
  }

  function getClusterNodeId(node: ClusterNode) {
    if (isCluster(node)) {
      return node.id;
    }
    return getLocationId(node);
  }

  function visitClusterLeaves(cluster: Cluster, visit: (id: string) => void) {
    for (const childId of cluster.children) {
      const child = clustersById.get(childId);
      if (child) {
        visitClusterLeaves(child, visit);
      } else {
        visit(childId);
      }
    }
  }

  const expandCluster = (cluster: Cluster, targetZoom: number = maxZoom) => {
    const ids: string[] = [];
    const pushExpandedClusterIds = (c: Cluster, expandedIds: string[]) => {
      if (targetZoom > c.zoom) {
        for (const childId of c.children) {
          const child = clustersById.get(childId);
          if (child) {
            pushExpandedClusterIds(child, expandedIds);
          } else {
            expandedIds.push(childId);
          }
        }
      } else {
        expandedIds.push(c.id);
      }
    };
    pushExpandedClusterIds(cluster, ids);
    return ids;
  };

  function findClusterFor(locationId: string, zoom: number) {
    const leavesToClusters = leavesToClustersByZoom.get(zoom);
    if (!leavesToClusters) {
      return undefined;
    }
    const cluster = leavesToClusters.get(locationId);
    return cluster ? cluster.id : undefined;
  }

  const availableZoomLevels = clusterLevels.map(cl => +cl.zoom).sort((a, b) => ascending(a, b));

  return {
    availableZoomLevels,

    getClusterNodesFor: zoom => {
      if (zoom === undefined) {
        return locations;
      }
      return nodesByZoom.get(zoom);
    },

    getClusterNodeId,

    getClusterById: clusterId => clustersById.get(clusterId),

    getMinZoomForLocation: locationId => minZoomByLocationId.get(locationId) || minZoom,

    expandCluster,

    findClusterFor,

    aggregateFlows: (flows, zoom, { getFlowOriginId, getFlowDestId, getFlowMagnitude }) => {
      if (zoom > maxZoom) {
        return flows;
      }
      const result = new Array<Flow>();
      const aggregateFlowsByKey = new Map<string, AggregateFlow>();
      const makeAggregateFlowKey = (originId: string, destId: string) => `${originId}:${destId}`;
      for (const flow of flows) {
        const originId = getFlowOriginId(flow);
        const destId = getFlowDestId(flow);
        const originClusterId = findClusterFor(originId, zoom) || originId;
        const destClusterId = findClusterFor(destId, zoom) || destId;
        const key = makeAggregateFlowKey(originClusterId, destClusterId);
        if (originClusterId === originId && destClusterId === destId) {
          result.push(flow);
        } else {
          let aggregateFlow = aggregateFlowsByKey.get(key);
          if (!aggregateFlow) {
            aggregateFlow = {
              origin: originClusterId,
              dest: destClusterId,
              count: 0,
              aggregate: true,
            };
            result.push(aggregateFlow);
            aggregateFlowsByKey.set(key, aggregateFlow);
          }
          aggregateFlow.count += getFlowMagnitude(flow);
        }
      }
      return result;
    },
  };
}

/**
 * @param availableZoomLevels Must be sorted in ascending order
 * @param targetZoom
 */
export function findAppropriateZoomLevel(availableZoomLevels: number[], targetZoom: number) {
  if (!availableZoomLevels.length) {
    throw new Error('No available zoom levels');
  }
  return availableZoomLevels[
    Math.min(bisectLeft(availableZoomLevels, Math.floor(targetZoom)), availableZoomLevels.length - 1)
  ];
}

// spherical mercator to longitude/latitude
function xLng(x: number) {
  return (x - 0.5) * 360;
}
function yLat(y: number) {
  const y2 = ((180 - y * 360) * Math.PI) / 180;
  return (360 * Math.atan(Math.exp(y2))) / Math.PI - 90;
}
