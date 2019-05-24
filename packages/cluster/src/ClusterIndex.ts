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
import { ascending, bisectLeft, extent } from 'd3-array';
import { AggregateFlow, Cluster, ClusterLevels, ClusterNode, isCluster } from './types';

export type FlowItem = Flow | AggregateFlow;
export type LocationWeightGetter = (id: string) => number;

/**
 * A data structure representing the cluster levels for efficient flow aggregation.
 */
export interface ClusterIndex {
  availableZoomLevels: number[];
  getClusterById: (clusterId: string) => Cluster | undefined;
  /**
   * List the nodes on the given zoom level.
   */
  getClusterNodesFor: (zoom: number | undefined) => ClusterNode[] | undefined;
  /**
   * Get the min zoom level on which the location is not clustered.
   */
  getMinZoomForLocation: (locationId: string) => number;
  /**
   * List the IDs of all locations in the cluster (leaves of the subtree starting in the cluster).
   */
  expandCluster: (cluster: Cluster, targetZoom?: number) => string[];
  /**
   * Find the cluster the given location is residing in on the specified zoom level.
   */
  findClusterFor: (locationId: string, zoom: number) => string | undefined;
  /**
   * Aggregate flows for the specified zoom level.
   */
  aggregateFlows: (
    flows: Flow[],
    zoom: number,
    { getFlowOriginId, getFlowDestId, getFlowMagnitude }: FlowAccessors,
  ) => FlowItem[];
}

/**
 * Build ClusterIndex from the given cluster hierarchy
 */
export function buildIndex(clusterLevels: ClusterLevels): ClusterIndex {
  const nodesByZoom = new Map<number, ClusterNode[]>();
  const clustersById = new Map<string, Cluster>();
  const minZoomByLocationId = new Map<string, number>();
  for (const { zoom, nodes } of clusterLevels) {
    nodesByZoom.set(zoom, nodes);
    for (const node of nodes) {
      if (isCluster(node)) {
        clustersById.set(node.id, node);
      } else {
        const { id } = node;
        const mz = minZoomByLocationId.get(id);
        if (mz == null || mz > zoom) {
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
      leavesToClusters = new Map<string, Cluster>();
      leavesToClustersByZoom.set(zoom, leavesToClusters);
    }
    visitClusterLeaves(cluster, leafId => {
      leavesToClusters!.set(leafId, cluster);
    });
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
    const visit = (c: Cluster, expandedIds: string[]) => {
      if (targetZoom > c.zoom) {
        for (const childId of c.children) {
          const child = clustersById.get(childId);
          if (child) {
            visit(child, expandedIds);
          } else {
            expandedIds.push(childId);
          }
        }
      } else {
        expandedIds.push(c.id);
      }
    };
    visit(cluster, ids);
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
        return undefined;
      }
      return nodesByZoom.get(zoom);
    },

    getClusterById: clusterId => clustersById.get(clusterId),

    getMinZoomForLocation: locationId => minZoomByLocationId.get(locationId) || minZoom,

    expandCluster,

    findClusterFor,

    aggregateFlows: (flows, zoom, { getFlowOriginId, getFlowDestId, getFlowMagnitude }) => {
      if (zoom > maxZoom) {
        return flows;
      }
      const result: Flow[] = [];
      const aggFlowsByKey = new Map<string, AggregateFlow>();
      const makeKey = (origin: string, dest: string) => `${origin}:${dest}`;
      for (const flow of flows) {
        const origin = getFlowOriginId(flow);
        const dest = getFlowDestId(flow);
        const originCluster = findClusterFor(origin, zoom) || origin;
        const destCluster = findClusterFor(dest, zoom) || dest;
        const key = makeKey(originCluster, destCluster);
        if (originCluster === origin && destCluster === dest) {
          result.push(flow);
        } else {
          let aggregateFlow = aggFlowsByKey.get(key);
          if (!aggregateFlow) {
            aggregateFlow = {
              origin: originCluster,
              dest: destCluster,
              count: 0,
              aggregate: true,
            };
            result.push(aggregateFlow);
            aggFlowsByKey.set(key, aggregateFlow);
          }
          aggregateFlow.count += getFlowMagnitude(flow);
        }
      }
      return result;
    },
  };
}

export function makeLocationWeightGetter(
  flows: Flow[],
  { getFlowOriginId, getFlowDestId, getFlowMagnitude }: FlowAccessors,
): LocationWeightGetter {
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
