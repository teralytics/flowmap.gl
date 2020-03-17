/*
 * Copyright 2018 Teralytics
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

import { Feature, FeatureCollection, GeometryObject } from 'geojson';

export type Flow = any;

export type LocationProperties = any;

export type Location = Feature<GeometryObject, LocationProperties> | any;

export type Locations = FeatureCollection<GeometryObject, LocationProperties> | Location[];

export function isFeatureCollection(
  locations: Locations,
): locations is FeatureCollection<GeometryObject, LocationProperties> {
  return (locations as FeatureCollection<GeometryObject, LocationProperties>).type === 'FeatureCollection';
}

export interface ViewState {
  latitude: number;
  longitude: number;
  zoom: number;
  bearing?: number;
  pitch?: number;
  altitude?: number;
}
export const enum LocationCircleType {
  INNER = 'inner',
  OUTER = 'outer',
  OUTLINE = 'outline',
}

export interface LocationCircle {
  location: Location;
  type: LocationCircleType;
}

export interface FlowAccessors {
  getFlowOriginId: FlowAccessor<string>;
  getFlowDestId: FlowAccessor<string>;
  getFlowMagnitude: FlowAccessor<number>;
  getFlowColor?: FlowAccessor<string | undefined>;
  getAnimatedFlowLineStaggering?: FlowAccessor<string | undefined>;
}

export interface LocationAccessors {
  getLocationId: LocationAccessor<string>;
  getLocationCentroid: LocationAccessor<[number, number]>;
  getLocationTotalIn?: LocationAccessor<number>;
  getLocationTotalOut?: LocationAccessor<number>;
  getLocationTotalWithin?: LocationAccessor<number>;
}

export type Data = Flow | Location | LocationCircle;

export enum PickingType {
  LOCATION = 'location',
  FLOW = 'flow',
  LOCATION_AREA = 'location-area',
}

export type DeckGLLayer = any;

export interface PickingInfo<T> {
  layer: DeckGLLayer;
  index: number;
  object: T;
  x: number;
  y: number;
  lngLat: [number, number];
}

export type PickingHandler<T> = (info: T, event: { srcEvent: MouseEvent }) => void;

export interface LocationPickingInfo extends PickingInfo<Data> {
  type: PickingType.LOCATION;
  object: Location;
  totalIn: number;
  totalOut: number;
  totalWithin: number;
  circleRadius: number;
}

export interface LocationAreaPickingInfo extends PickingInfo<Data> {
  type: PickingType.LOCATION_AREA;
  object: Location;
}

export interface FlowPickingInfo extends PickingInfo<Data> {
  type: PickingType.FLOW;
  object: Flow;
  origin: Location;
  dest: Location;
}

export type FlowLayerPickingInfo = LocationPickingInfo | LocationAreaPickingInfo | FlowPickingInfo;

// https://deck.gl/#/documentation/developer-guide/using-layers?section=accessors
export interface AccessorObjectInfo {
  index: number;
  data: any;
  target: any[];
}
export type FlowAccessor<T> = (flow: Flow, objectInfo?: AccessorObjectInfo) => T;
export type LocationAccessor<T> = (location: Location) => T;
export type LocationCircleAccessor<T> = (locCircle: LocationCircle) => T;

export type NumberScale = (value: number) => number;
