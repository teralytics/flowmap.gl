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

import { Flow, Location } from '@flowmap.gl/core';

export interface LocationCluster extends Location {
  id: string;
  parentId: string | undefined;
  zoom: number;
  centroid: [number, number];
  children: Array<Location | LocationCluster>;
}

export function isLocationCluster(l: Location): l is LocationCluster {
  const { zoom } = l as LocationCluster;
  return zoom !== undefined;
}

export interface AggregateFlow extends Flow {
  origin: string;
  dest: string;
  count: number;
  aggregate: true;
}

export function isAggregateFlow(flow: Flow): flow is AggregateFlow {
  const { aggregate } = flow as Flow;
  return flow ? true : false;
}
