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

// tslint:disable:max-classes-per-file
declare module 'deck.gl' {
  import { mat4 } from '@mapbox/gl-matrix';
  import { Feature, FeatureCollection, GeometryObject } from 'geojson';
  import * as React from 'react';

  export const COORDINATE_SYSTEM: {
    LNGLAT: number;
    LNGLAT_OFFSETS: number;
    METER_OFFSETS: number;
    METERS: number;
    IDENTITY: number;
  };

  export interface PickingInfo<T> {
    layer: Layer;
    index: number;
    object: T;
    x: number;
    y: number;
    lngLat: [number, number];
  }

  export type PickingHandler<T> = (info: T) => void;

  export interface UpdateTriggers {
    [key: string]: {};
  }

  export interface LayerProps {
    id: string;
    visible?: boolean;
    opacity?: number;
    pickable?: boolean;
    fp64?: boolean;
    updateTriggers?: UpdateTriggers;
    coordinateSystem?: number;
  }

  export class AttributeManager {
    // tslint:disable-next-line:no-any
    addInstanced(attributes: any): void;
  }

  export interface LayerState {
    attributeManager: AttributeManager;
    // tslint:disable-next-line:no-any
    model: any;
  }

  export interface ChangeFlags {
    dataChanged: boolean | string;
    propChanged: boolean | string;
    propsOrDataChanged: boolean | string;
    updateTriggersChanged: boolean | string;
    viewportChanged: boolean | string;
    somethingChanged: boolean | string;
  }

  export interface UpdateStateParams<TProps, TContext> {
    props: TProps;
    oldProps: TProps;
    context: TContext;
    oldContext: TContext;
    changeFlags: ChangeFlags;
  }

  // tslint:disable-next-line:no-any
  export type ShaderCache = any; // TODO: figure out type

  export interface Shaders {
    vs: string;
    fs: string;
    modules: Array<{}>;
    shaderCache: ShaderCache;
  }

  export interface Attribute {
    value: {
      [key: number]: number;
    };
    size: number;
  }

  export const enum PickingMode {
    CLICK = 'click',
    HOVER = 'hover',
  }

  export interface PickParams {
    // tslint:disable-next-line:no-any
    info: any;
    mode: PickingMode;
    sourceLayer: Layer;
  }

  export interface DrawParams {
    // tslint:disable-next-line:no-any
    uniforms: any;
  }

  export class Layer<TProps extends LayerProps = LayerProps, TState extends LayerState = LayerState, TContext = {}> {
    id: string;
    props: TProps;
    state: TState;
    context: TContext;

    constructor(props: TProps);

    initializeState(): void;
    updateState(params: UpdateStateParams<TProps, TContext>): void;
    setState(state: Partial<TState>): void;
    getShaders(): Shaders;
    calculateInstanceLocations(attribute: Attribute): void;
    calculateInstanceColors(attribute: Attribute): void;
    getPickingInfo(params: PickParams): {};
    draw(drawParams: DrawParams): void;
  }

  export class Effect {}

  export class Viewport {
    width: number;
    height: number;
    scale: number;
    viewMatrix: mat4;
    projectionMatrix: mat4;
    distanceScales: {};

    constructor(props: {
      width?: number;
      height?: number;
      viewMatrix?: mat4;
      projectionMatrix?: mat4;
      distanceScales?: {};
    });
  }

  export interface DeckGLProps {
    id?: string;
    width: number;
    height: number;
    layers: Layer[];
    effects?: Effect[];
    gl?: {};
    debug?: boolean;
    pickingRadius?: number;
    viewport?: Viewport;
    onWebGLInitialized?: () => void;
    onAfterRender?: () => void;
    onLayerClick?: () => void;
    onLayerHover?: () => void;
  }

  class DeckGL extends React.Component<DeckGLProps> {}

  export default DeckGL;

  export { DeckGL };

  export interface PointDataSimple {
    position: [number, number, number];
    normal: [number, number, number];
    color: [number, number, number];
  }

  // tslint:disable-next-line:no-any
  export type PointData = PointDataSimple | any;

  export interface PointCloudLayerProps<T extends PointData> extends LayerProps {
    data: T[];
    radiusPixels?: number;
    pickable?: boolean;
    onClick?: PickingHandler<PickingInfo<T>>;
    onHover?: PickingHandler<PickingInfo<T>>;
    getPosition?: (x: T) => [number, number, number];
    getNormal?: (x: T) => [number, number, number];
    getColor?: (x: T) => [number, number, number];
  }

  export class PointCloudLayer<T extends PointData> extends Layer<PointCloudLayerProps<T>> {
    constructor(props: PointCloudLayerProps<T>);
  }

  export type GeoJsonData<T extends GeometryObject> = Feature<T> | FeatureCollection<T>;

  // tslint:disable-next-line:no-any
  export interface GeoJsonLayerProps<T extends GeometryObject> extends LayerProps {
    data: GeoJsonData<T>;
    stroked?: boolean;
    filled?: boolean;
    extruded?: boolean;
    wireframe?: boolean;
    lineWidthScale?: number;
    lineWidthMinPixels?: number;
    lineWidthMaxPixels?: number;
    lineJointRounded?: boolean;
    lineMiterLimit?: number;
    pointRadiusScale?: number;
    pointRadiusMinPixels?: number;
    pointRadiusMaxPixels?: number;
    onClick?: PickingHandler<PickingInfo<Feature<T>>>;
    onHover?: PickingHandler<PickingInfo<Feature<T>>>;
    // tslint:disable-next-line:no-any
    getLineColor?: (feature: any) => [number, number, number, number];
    // tslint:disable-next-line:no-any
    getFillColor?: (feature: any) => [number, number, number, number];
    // tslint:disable-next-line:no-any
    getRadius?: (feature: any) => number;
    // tslint:disable-next-line:no-any
    getLineWidth?: (feature: any) => number;
    // tslint:disable-next-line:no-any
    getElevation?: (feature: any) => number;
  }

  export class GeoJsonLayer<T extends GeometryObject> extends Layer<GeoJsonLayerProps<T>> {
    constructor(props: GeoJsonLayerProps<T>);
  }

  export interface LineDataSimple {
    sourcePosition: [number, number, number];
    targetPosition: [number, number, number];
    color: [number, number, number];
  }

  // tslint:disable-next-line:no-any
  export type LineData = LineDataSimple | any;

  export interface LineLayerProps<T extends LineData> extends LayerProps {
    data: T[];
    strokeWidth?: number;
    onClick?: PickingHandler<PickingInfo<T>>;
    onHover?: PickingHandler<PickingInfo<T>>;
    getSourcePosition?: (x: T) => [number, number, number];
    getTargetPosition?: (x: T) => [number, number, number];
    getColor?: (x: T) => [number, number, number];
  }

  export class LineLayer<T extends LineData> extends Layer<LineLayerProps<T>> {
    constructor(props: LineLayerProps<T>);
  }

  export interface ScatterplotDataSimple {
    position?: [number, number];
    radius?: number;
    color?: [number, number, number];
  }

  // tslint:disable-next-line:no-any
  export type ScatterplotData = ScatterplotDataSimple | any;

  export interface ScatterplotLayerProps<T extends ScatterplotData> extends LayerProps {
    data: ScatterplotData[];
    radiusScale?: number;
    outline?: boolean;
    strokeWidth?: number;
    radiusMinPixels?: number;
    radiusMaxPixels?: number;
    onClick?: PickingHandler<PickingInfo<T>>;
    onHover?: PickingHandler<PickingInfo<T>>;
    getPosition?: (d: T) => [number, number];
    getRadius?: (d: T) => number;
    getColor?: (d: T) => [number, number, number, number];
  }

  export class ScatterplotLayer<T extends ScatterplotData> extends Layer<ScatterplotLayerProps<T>> {
    constructor(props: ScatterplotLayerProps<T>);
  }

  export class CompositeLayer<
    TProps extends LayerProps = LayerProps,
    TState extends LayerState = LayerState,
    TContext = {}
  > extends Layer<TProps, TState, TContext> {
    renderLayers(): Layer[];
  }

  interface Experimental {
    enable64bitSupport: (props: LayerProps) => boolean;
    fp64ify: (a: number) => [number, number];
  }

  export const experimental: Experimental;
}
