import { PickingInfo } from 'deck.gl';
import { Feature, FeatureCollection, GeometryObject } from 'geojson';

export type RGBA = [number, number, number, number];

export interface Colors {
  flows: FlowColors;
  locationCircles: LocationCircleColors;
  locationAreas: LocationAreaColors;
}

export interface FlowColors {
  max: RGBA;
  min: RGBA;
}

export interface LocationCircleColors {
  inner: RGBA;
  outgoing: RGBA;
  incoming: RGBA;
  dimmed: RGBA;
  none: RGBA;
}

export interface LocationAreaColors {
  outline: RGBA;
  normal: RGBA;
  selected: RGBA;
  highlighted: RGBA;
  connected: RGBA;
  none: RGBA;
}

export interface DiffColors {
  positive: {
    flows: FlowColors;
    locationCircles: LocationCircleColors;
  };
  negative: {
    flows: FlowColors;
    locationCircles: LocationCircleColors;
  };
  locationAreas: LocationAreaColors;
}

export function isDiffColors(colors: DiffColors | Colors): colors is DiffColors {
  return (colors as DiffColors).positive !== undefined;
}

// tslint:disable-next-line:no-any
export type Flow = any;

// tslint:disable-next-line:no-any
export type LocationProperties = any;

export type Location = Feature<GeometryObject, LocationProperties>;

export type Locations = FeatureCollection<GeometryObject, LocationProperties>;

export const enum LocationCircleType {
  INNER = 'inner',
  OUTER = 'outer',
}

export interface LocationCircle {
  location: Location;
  type: LocationCircleType;
}

export type Data = Flow | Location | LocationCircle;

export const enum PickingType {
  LOCATION = 'location',
  FLOW = 'flow',
  LOCATION_AREA = 'location-area',
}

export interface LocationPickingInfo extends PickingInfo<Data> {
  type: PickingType.LOCATION;
  object: Location;
}

export interface LocationAreaPickingInfo extends PickingInfo<Data> {
  type: PickingType.LOCATION_AREA;
  object: Location;
}

export interface FlowPickingInfo extends PickingInfo<Data> {
  type: PickingType.FLOW;
  object: Flow;
}

export type FlowLayerPickingInfo = LocationPickingInfo | LocationAreaPickingInfo | FlowPickingInfo;

export type FlowAccessor<T> = (flow: Flow) => T;
export type LocationAccessor<T> = (location: Location) => T;
export type LocationCircleAccessor<T> = (locCircle: LocationCircle) => T;

export type NumberScale = (value: number) => number;
export type ColorScale = (value: number) => string;
