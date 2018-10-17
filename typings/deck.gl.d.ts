// tslint:disable:max-classes-per-file
// tslint:disable:no-any

declare module 'deck.gl' {
  import { Feature, FeatureCollection, GeometryObject } from 'geojson';
  import * as React from 'react';
  import { MapControlEvent, Viewport as ViewState } from 'react-map-gl';
  import { WebMercatorViewport } from 'viewport-mercator-project';

  export interface PickingInfo<T> {
    layer: Layer;
    index: number;
    object: T;
    x: number;
    y: number;
    lngLat: [number, number];
  }

  export type PickingHandler<T> = (info: T) => void;

  export interface LayerProps {
    id: string;
    visible?: boolean;
    opacity?: number;
    pickable?: boolean;
    fp64?: boolean;
    updateTriggers?: { [key: string]: {} };
    coordinateSystem?: number;
  }

  export class AttributeManager {
    addInstanced(attributes: any): void;
  }

  export interface LayerState {
    attributeManager: AttributeManager;
    model: any;
  }

  export interface ChangeFlags {
    dataChanged: boolean | string;
    propsChanged: boolean | string;
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

  export type ShaderCache = any;

  export interface Shaders {
    vs: string;
    fs: string;
    modules: Array<{}>;
    shaderCache: any;
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
    info: any;
    mode: PickingMode;
    sourceLayer: Layer;
  }

  export interface DrawParams {
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
    calculateInstanceColors(attribute: Attribute): void;
    getPickingInfo(params: PickParams): {};
    draw(drawParams: DrawParams): void;
    use64bitProjection(): boolean;
  }

  export interface DeckGLRenderProps {
    x: number;
    y: number;
    width: number;
    height: number;
    viewState: ViewState;
    viewport: WebMercatorViewport;
  }

  export interface ViewStateChangeInfo {
    viewState: ViewState;
  }

  export interface InteractiveState {
    isDragging: boolean;
  }

  export interface DeckGLProps extends Partial<ViewState> {
    width?: number;
    height?: number;
    layers: Layer[];
    viewState?: ViewState;
    initialViewState?: ViewState;
    id?: string;
    style?: {};
    pickingRadius?: number;
    useDevicePixels?: boolean;
    controller?: boolean | any;
    getCursor?: (state: InteractiveState) => string;
    onViewStateChange?: (info: ViewStateChangeInfo) => void;
    onLayerHover?: PickingHandler<PickingInfo<any>>;
    children?: (props: DeckGLRenderProps) => JSX.Element | React.ReactNode;
  }

  class DeckGL extends React.Component<DeckGLProps> {}

  export default DeckGL;

  export { DeckGL };

  export type Color = [number, number, number] | [number, number, number, number];

  export interface PointDataSimple {
    position: [number, number, number];
    normal: [number, number, number];
    color: Color;
  }

  export type PointData = PointDataSimple | any;

  export interface PointCloudLayerProps<T extends PointData> extends LayerProps {
    data: T[];
    radiusPixels?: number;
    lightSettings?: {
      lightsPosition: number[];
      ambientRatio: number;
      diffuseRatio: number;
      specularRatio: number;
      lightsStrength: number[];
      numberOfLights: number;
    };
    onClick?: PickingHandler<PickingInfo<T>>;
    onHover?: PickingHandler<PickingInfo<T>>;
    getPosition?: (x: T) => [number, number, number];
    getNormal?: ((x: T) => [number, number, number]) | [number, number, number];
    getColor?: ((x: T) => Color) | Color;
  }

  export class PointCloudLayer<T extends PointData> extends Layer<PointCloudLayerProps<T>> {
    constructor(props: PointCloudLayerProps<T>);
  }

  export type GeoJsonData<T extends GeometryObject> = Feature<T> | FeatureCollection<T>;

  export interface GeoJsonLayerProps<T extends GeometryObject> extends LayerProps {
    data: GeoJsonData<T>;
    filled?: boolean;
    stroked?: boolean;
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
    getLineColor?: ((feature: any) => Color) | Color;
    getFillColor?: ((feature: any) => Color) | Color;
    getRadius?: ((feature: any) => number) | number;
    getLineWidth?: ((feature: any) => number) | number;
    getElevation?: ((feature: any) => number) | number;
  }

  export class GeoJsonLayer<T extends GeometryObject> extends Layer<GeoJsonLayerProps<T>> {
    constructor(props: GeoJsonLayerProps<T>);
  }

  export interface LineDataSimple {
    sourcePosition: [number, number, number];
    targetPosition: [number, number, number];
    color: Color;
  }

  export type LineData = LineDataSimple | any;

  export interface LineLayerProps<T extends LineData> extends LayerProps {
    data: T[];
    onClick?: PickingHandler<PickingInfo<T>>;
    onHover?: PickingHandler<PickingInfo<T>>;
    getSourcePosition?: (x: T) => [number, number, number];
    getTargetPosition?: (x: T) => [number, number, number];
    getColor?: ((x: T) => Color) | Color;
    getStrokeWidth?: ((x: T) => number) | number;
  }

  export class LineLayer<T extends LineData> extends Layer<LineLayerProps<T>> {
    constructor(props: LineLayerProps<T>);
  }

  export interface ScatterplotDataSimple {
    position?: [number, number];
    radius?: number;
    color?: [number, number, number];
  }

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
    getRadius?: ((d: T) => number) | number;
    getColor?: ((x: T) => Color) | Color;
  }

  export class ScatterplotLayer<T extends ScatterplotData> extends Layer<ScatterplotLayerProps<T>> {
    constructor(props: ScatterplotLayerProps<T>);
  }

  export interface TextDataSimple {
    text: string;
    position: [number, number, number];
    size: number;
    color: Color;
    angle: number;
    textAnchor?: string;
    alignmentBaseline?: string;
    pixelOffset?: [number, number];
  }

  export type TextData = TextDataSimple | any;

  export interface TextLayerProps<T extends TextData> extends LayerProps {
    data: T[];
    sizeScale?: ((x: T) => number) | number;
    fontFamily?: string;
    characterSet?: string;
    getText?: ((x: T) => string) | string;
    getPosition?: (x: T) => [number, number, number];
    getColor?: ((x: T) => Color) | Color;
    getSize?: ((x: T) => number) | number;
    getAngle?: ((x: T) => number) | number;
    getTextAnchor?: string;
    getAlignmentBaseline?: string;
    getPixelOffset?: [0, 0];
  }

  export class TextLayer<T extends TextData> extends Layer<TextLayerProps<T>> {
    constructor(props: TextLayerProps<T>);
  }

  export class CompositeLayer<
    TProps extends LayerProps = LayerProps,
    TState extends LayerState = LayerState,
    TContext = {}
  > extends Layer<TProps, TState, TContext> {
    renderLayers(): Layer[];
  }

  export interface ControllerOptions {
    type: any;
    [key: string]: any;
  }

  export class Controller {
    events: string[];
    constructor(viewState: any, options: ControllerOptions);
    toggleEvents(events: string[], enabled: boolean): void;
    handleEvent(event: MapControlEvent): void;
  }

  export class MapController extends Controller {
    constructor(options: ControllerOptions);
  }
}
