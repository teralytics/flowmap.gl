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
import { extent, range, rollup } from 'd3-array';
import Supercluster from 'supercluster';
import { AggregateFlow, isLocationCluster, LocationCluster } from './types';

const MAX_CLUSTER_ZOOM = 18;
const CLUSTER_ID_PREFIX = 'cluster::';

export const makeClusterId = (id: string | number) => `${CLUSTER_ID_PREFIX}${id}`;

export type LocationItem = Location | LocationCluster;
export type FlowItem = Flow | AggregateFlow;
export type ClusteredFlowsByZoom = Map<number, FlowItem[]>;
export type LocationWeightGetter = (id: string) => number;

export interface ClusterIndex {
  availableZoomLevels: number[];
  getLocationItemsFor: (zoom: number | undefined) => LocationItem[] | undefined;
  getLocationItemId: (item: LocationItem) => string;
  getClusterById: (clusterId: string) => LocationCluster | undefined;
  getMinZoomForLocation: (locationId: string) => number;
  expandCluster: (cluster: LocationCluster, targetZoom?: number) => string[];
  findClusterFor: (locationId: string, zoom: number) => string | undefined;
  aggregateFlows: (
    flows: Flow[],
    { getFlowOriginId, getFlowDestId, getFlowMagnitude }: FlowAccessors,
  ) => ClusteredFlowsByZoom;
}

export interface ClusterLevel {
  zoom: number;
  clusters: Array<{
    id: string;
    name: string;
    centroid: [number, number];
    children: string[];
  }>;
}

export function buildForPredefinedClusters(
  clusterLevels: ClusterLevel[],
  locations: Location[],
  locationAccessors: LocationAccessors,
) {
  const itemsByZoom = new Map<number, LocationItem[]>();
  const clustersById = new Map<string, LocationCluster>();
  const minZoomByLocationId = new Map<string, number>();
  const leavesToClustersByZoom = new Map<number, Map<string, LocationItem>>();

  for (const { zoom, clusters } of clusterLevels) {
    for (const cluster of clusters) {
      clustersById.set(cluster.id, {
        id: cluster.id,
        name: cluster.name,
        centroid: cluster.centroid,
        zoom,
        children: cluster.children,
      });
    }
  }

  return buildClusterTree(
    clusterLevels.map(cl => cl.zoom).sort(),
    locations,
    locationAccessors,
    itemsByZoom,
    clustersById,
    minZoomByLocationId,
    leavesToClustersByZoom,
  );
}

export function buildForLocationsByCentroidDistance(
  locations: Location[],
  locationAccessors: LocationAccessors,
  getLocationWeight: LocationWeightGetter,
  makeClusterName: (id: string, numPoints: number, children: LocationItem[]) => string,
): ClusterIndex {
  const { getLocationCentroid, getLocationId } = locationAccessors;
  const supercluster = new Supercluster({
    radius: 40,
    maxZoom: MAX_CLUSTER_ZOOM,
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
  // if (trees.length === 0) return undefined
  const numbersOfClusters = trees.map(d => d.points.length);
  const maxZoom = numbersOfClusters.indexOf(numbersOfClusters[numbersOfClusters.length - 1]);
  const minZoom = Math.min(maxZoom, numbersOfClusters.lastIndexOf(numbersOfClusters[0]));

  const itemsByZoom = new Map();
  const clustersById = new Map<string, LocationCluster>();
  const minZoomByLocationId = new Map<string, number>();
  for (let zoom = maxZoom; zoom >= minZoom; zoom--) {
    let childrenByParent: Map<string, LocationItem[]> | undefined;
    const tree = trees[zoom];
    if (zoom < maxZoom) {
      childrenByParent = rollup<any[], string, LocationItem[]>(
        trees[zoom + 1].points,
        (points: any[]) => points.map((p: any) => (p.id ? clustersById.get(makeClusterId(p.id))! : locations[p.index])),
        (point: any) => point.parentId,
      );
    }

    const items: Array<LocationCluster | Location> = [];
    for (const point of tree.points) {
      const { id, x, y, index, numPoints } = point;
      if (id === undefined) {
        const location = locations[index];
        minZoomByLocationId.set(location.id, zoom);
        items.push(location);
      } else {
        const children = childrenByParent && childrenByParent.get(id);
        if (!children) {
          throw new Error(`Cluster ${id} doesn't have children`);
        }
        const cluster: LocationCluster = {
          id: makeClusterId(id),
          name: makeClusterName(id, numPoints, children),
          zoom,
          centroid: [xLng(x), yLat(y)] as [number, number],
          children,
        };
        items.push(cluster);
        clustersById.set(cluster.id, cluster);
      }
    }
    itemsByZoom.set(zoom, items);
  }

  const leavesToClustersByZoom = new Map<number, Map<string, LocationItem>>();
  for (let zoom = maxZoom - 1; zoom >= minZoom; zoom--) {
    const result = new Map<string, LocationItem>();
    const items = itemsByZoom.get(zoom);
    if (!items) {
      continue;
    }
    const nextLeavesToClusters = leavesToClustersByZoom.get(zoom + 1)!;
    for (const item of items) {
      if (isLocationCluster(item)) {
        for (const child of item.children) {
          if (isLocationCluster(child)) {
            for (const [leafId, cluster] of nextLeavesToClusters.entries()) {
              if (cluster.id === child.id) {
                result.set(leafId, item);
              }
            }
          } else {
            result.set(getLocationId(child), item);
          }
        }
      }
    }
    leavesToClustersByZoom.set(zoom, result);
  }

  return buildClusterTree(
    range(minZoom, maxZoom + 1),
    locations,
    locationAccessors,
    itemsByZoom,
    clustersById,
    minZoomByLocationId,
    leavesToClustersByZoom,
  );
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
 * @param availableZoomLevels Must be sorted
 * @param targetZoom
 */
export function findAppropriateZoomLevel(availableZoomLevels: number[], targetZoom: number) {
  if (!availableZoomLevels.length) {
    throw new Error('No available zoom levels');
  }

  let i = availableZoomLevels.length - 1;
  let zoom = availableZoomLevels[0];
  while (i > 0) {
    if (availableZoomLevels[i] < Math.floor(targetZoom)) {
      return zoom;
    }
    zoom = availableZoomLevels[i];
    i--;
  }
  return zoom;
}

function buildClusterTree(
  availableZoomLevels: number[],
  locations: Location[],
  locationAccessors: LocationAccessors,
  itemsByZoom: Map<number, LocationItem[]>,
  clustersById: Map<string, LocationCluster>,
  minZoomByLocationId: Map<string, number>,
  leavesToClustersByZoom: Map<number, Map<string, LocationItem>>,
): ClusterIndex {
  function getLocationItemId(item: LocationItem) {
    if (isLocationCluster(item)) {
      return item.id;
    }
    const { getLocationId } = locationAccessors;
    return getLocationId(item);
  }

  /**
   * Adds the list of loc/cluster IDs for targetZoom to idsToAddTo
   * Will mutate (append to) expandedIds.
   * Does not mutate ClusterTree
   */
  function pushExpandedClusterIds(item: LocationItem, targetZoom: number, expandedIds: string[]) {
    if (isLocationCluster(item)) {
      if (targetZoom !== undefined) {
        if (targetZoom > item.zoom) {
          for (const child of item.children) {
            pushExpandedClusterIds(child, targetZoom, expandedIds);
          }
        } else {
          expandedIds.push(item.id);
        }
      }
    } else {
      expandedIds.push(getLocationItemId(item));
    }
  }

  const [minZoom, maxZoom] = extent(availableZoomLevels);
  if (minZoom == null || maxZoom == null) {
    throw new Error('No zoom levels available');
  }

  return {
    availableZoomLevels,

    getLocationItemsFor: zoom => {
      if (zoom === undefined) {
        return locations;
      }
      return itemsByZoom.get(zoom);
    },

    getLocationItemId,

    getClusterById: clusterId => clustersById.get(clusterId),

    getMinZoomForLocation: locationId => minZoomByLocationId.get(locationId) || minZoom,

    expandCluster(cluster: LocationCluster, targetZoom?: number) {
      const ids: string[] = [];
      pushExpandedClusterIds(cluster, targetZoom !== undefined ? targetZoom : maxZoom, ids);
      return ids;
    },

    findClusterFor(locationId: string, zoom: number) {
      const clustersForZoom = leavesToClustersByZoom.get(zoom);
      if (!clustersForZoom) {
        return undefined;
      }
      const cluster = clustersForZoom.get(locationId);
      return cluster ? cluster.id : undefined;
    },

    aggregateFlows(
      flows: Flow[],
      { getFlowOriginId, getFlowDestId, getFlowMagnitude }: FlowAccessors,
    ): ClusteredFlowsByZoom {
      const flowsByZoom = new Map();
      const allZoomFlows: { [key: string]: Flow } = {};
      for (let zoom = maxZoom; zoom >= minZoom; zoom--) {
        if (zoom < maxZoom) {
          const zoomFlows: { [key: string]: Flow } = {};
          for (const flow of flows) {
            const originId = getFlowOriginId(flow);
            const destId = getFlowDestId(flow);
            const originClusterId = this.findClusterFor(originId, zoom) || originId;
            const destClusterId = this.findClusterFor(destId, zoom) || destId;
            const key = `${originClusterId}:->:${destClusterId}`;
            if (originClusterId === originId && destClusterId === destId) {
              zoomFlows[key] = flow;
            } else {
              if (allZoomFlows[key]) {
                if (!zoomFlows[key]) {
                  // reuse flow from a different zoom level
                  zoomFlows[key] = allZoomFlows[key];
                }
              } else {
                if (!zoomFlows[key]) {
                  zoomFlows[key] = {
                    origin: originClusterId,
                    dest: destClusterId,
                    count: 0,
                    aggregate: true,
                  } as AggregateFlow;
                }
                zoomFlows[key].count += getFlowMagnitude(flow);
              }
            }
          }
          for (const [key, value] of Object.entries(zoomFlows)) {
            // save all entries from this zoom level to the global for reuse on lower zoom levels
            allZoomFlows[key] = value;
          }
          flowsByZoom.set(zoom, Object.values(zoomFlows));
        } else {
          flowsByZoom.set(zoom, flows);
        }
      }
      return flowsByZoom;
    },
  };
}

// spherical mercator to longitude/latitude
function xLng(x: number) {
  return (x - 0.5) * 360;
}
function yLat(y: number) {
  const y2 = ((180 - y * 360) * Math.PI) / 180;
  return (360 * Math.atan(Math.exp(y2))) / Math.PI - 90;
}
