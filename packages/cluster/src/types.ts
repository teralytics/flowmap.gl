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

import { Flow } from '@flowmap.gl/core';

export interface ClusterNode {
  id: string;
  zoom: number;
  centroid: [number, number];
}

export interface ClusterLevel {
  zoom: number;
  nodes: ClusterNode[];
}

export type ClusterLevels = ClusterLevel[];

export interface Cluster extends ClusterNode {
  name?: string;
  children: string[];
}

export function isCluster(c: ClusterNode): c is Cluster {
  const { children } = c as Cluster;
  return children && children.length > 0;
}

export interface AggregateFlow {
  origin: string;
  dest: string;
  count: number;
  aggregate: true;
}

export function isAggregateFlow(flow: Flow): flow is AggregateFlow {
  const { origin, dest, count, aggregate } = flow as AggregateFlow;
  return origin !== undefined && dest !== undefined && count !== undefined && (aggregate ? true : false);
}

export interface FlowCountsMapReduce<T = any> {
  map: (flow: Flow) => T;
  reduce: (accumulated: T, val: T) => T;
}
