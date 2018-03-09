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
// tslint:disable:no-any

declare module 'react-map-gl' {
  import { Feature } from 'geojson';
  import { GeoJSONGeometry, Map, PointLike } from 'mapbox-gl';
  import { Component, PureComponent } from 'react';

  export const enum TRANSITION_EVENTS {
    BREAK = 1,
    SNAP_TO_END = 2,
    IGNORE = 3,
  }

  export type EasingFunction = (t: number) => number;

  export interface Viewport {
    latitude: number;
    longitude: number;
    zoom: number;
    bearing?: number;
    pitch?: number;
    transitionDuration?: number;
    transitionInterpolator?: TransitionInterpolator;
    transitionInterruption?: TRANSITION_EVENTS;
    transitionEasing?: EasingFunction;
  }

  export interface MapError {
    message: string;
  }

  export interface MapRequest {
    url: string;
    headers: {};
    credentials: string;
  }

  export interface StaticMapProps extends Viewport {
    mapboxApiAccessToken?: string;
    mapStyle?: string | {};
    width: number;
    height: number;
    altitude?: number;
    preserveDrawingBuffer?: boolean;
    attributionControl?: boolean;
    reuseMaps?: boolean;
    preventStyleDiffing?: boolean;
    visible?: boolean;
    onLoad?: () => void;
    onError?: (error: MapError) => void;
    transformRequest?: () => MapRequest;
  }

  export interface QueryRenderedFeaturesParams {
    layers?: string[];
    filter?: any[];
  }

  export class StaticMap extends PureComponent<StaticMapProps> {
    getMap(): Map;
    queryRenderedFeatures(
      pointOrBox?: PointLike | PointLike[],
      parameters?: QueryRenderedFeaturesParams,
    ): Array<Feature<GeoJSONGeometry>>;
  }

  export interface InteractiveMapState {
    isDragging: boolean;
    isHovering: boolean;
  }

  export interface MapEvent {
    lngLat: [number, number];
    features: Array<{}>;
  }

  export interface InteractiveMapProps extends StaticMapProps {
    onViewportChange?: (viewport: Viewport) => void;
    maxZoom?: number;
    minZoom?: number;
    maxPitch?: number;
    minPitch?: number;
    scrollZoom?: boolean;
    dragPan?: boolean;
    dragRotate?: boolean;
    doubleClickZoom?: boolean;
    touchZoom?: boolean;
    touchRotate?: boolean;
    clickRadius?: number;
    mapControls?: {
      events: string[];
      handleEvent: (event: MapEvent, context: any) => void;
    };
    visibilityConstraints?: {
      minZoom: number;
      maxZoom: number;
      minPitch: number;
      maxPitch: number;
    };
    onHover?: (event: MapEvent) => void;
    onClick?: (event: MapEvent) => void;
    getCursor?: (state: InteractiveMapState) => void;
    onTransitionStart?: () => void;
    onTransitionInterrupt?: () => void;
    onTransitionEnd?: () => void;
  }

  export class InteractiveMap extends PureComponent<InteractiveMapProps, InteractiveMapState> {
    getMap(): Map;
    queryRenderedFeatures(
      pointOrBox?: PointLike | PointLike[],
      parameters?: QueryRenderedFeaturesParams,
    ): Array<Feature<GeoJSONGeometry>>;
  }

  export default InteractiveMap;

  export interface BaseControlProps {
    captureScroll?: boolean;
    captureDrag?: boolean;
    captureClick?: boolean;
    captureDoubleClick?: boolean;
  }

  export class BaseControl<T extends BaseControlProps> extends Component<T> {}

  export interface MarkerProps extends BaseControlProps {
    className?: string;
    longitude: number;
    latitude: number;
    offsetLeft?: number;
    offsetTop?: number;
  }

  export class Marker extends BaseControl<MarkerProps> {}

  export const enum ANCHOR_POSITION {
    TOP = 'top',
    TOP_LEFT = 'top-left',
    TOP_RIGHT = 'top-right',
    BOTTOM = 'bottom',
    BOTTOM_LEFT = 'bottom-left',
    BOTTOM_RIGHT = 'bottom-right',
    LEFT = 'left',
    RIGHT = 'right',
  }

  export interface PopupProps extends BaseControlProps {
    className?: string;
    longitude: number;
    latitude: number;
    offsetLeft?: number;
    offsetTop?: number;
    tipSize?: number;
    closeButton?: boolean;
    closeOnClick?: boolean;
    anchor?: ANCHOR_POSITION;
    dynamicPosition?: boolean;
    onClose?: () => void;
  }

  export class Popup extends BaseControl<PopupProps> {}

  export interface NavigationControlProps extends BaseControlProps {
    onViewportChange: (viewport: Viewport) => void;
    showZoom?: boolean;
    showCompass?: boolean;
  }

  export class NavigationControl extends BaseControl<NavigationControlProps> {}

  export class TransitionInterpolator {}

  export class LinearInterpolator extends TransitionInterpolator {
    constructor(transitionProps?: string[]);
  }

  export class FlyToInterpolator extends TransitionInterpolator {}

  export interface Center {
    x: number;
    y: number;
  }

  export interface MapControlEvent {
    type: string;
    center: Center;
    offsetCenter: Center;
    target: any;
    srcEvent: any;
    key?: number;
    leftButton?: boolean;
    middleButton?: boolean;
    rightButton?: boolean;
    pointerType?: string;
    delta?: number;
  }

  export interface MapState {
    width: number;
    height: number;
    latitude: number;
    longitude: number;
    zoom: number;
    bearing?: number;
    pitch?: number;
    altitude?: number;
    maxZoom?: number;
    minZoom?: number;
    maxPitch?: number;
    minPitch?: number;
    startPanLngLat?: [number, number];
    startZoomLngLat?: [number, number];
    startBearing?: number;
    startPitch?: number;
    startZoom?: number;
  }

  export interface Options {
    // TODO(deprecate): remove this when `onChangeViewport` gets deprecated
    onChangeViewport?: (viewport: Viewport) => void;
    // TODO(deprecate): remove this when `touchZoomRotate` gets deprecated
    touchZoomRotate?: boolean;
    onViewportChange?: (viewport: Viewport) => void;
    onStateChange?: (state: MapState) => void;
    eventManager?: any;
    scrollZoom?: boolean;
    dragPan?: boolean;
    dragRotate?: boolean;
    doubleClickZoom?: boolean;
    touchZoom?: boolean;
    touchRotate?: boolean;
    keyboard?: boolean;
  }

  class MapControls {
    events: string[];
    handleEvent: (event: MapControlEvent) => void;
    getMapState(overrides: Partial<MapState>): MapState;
    setOptions(options: Options): void;
    setState(newState: MapState): void;
    updateViewport(newMapState: MapState, extraProps: any, extraState: InteractiveMapState): void;
  }

  function autobind(obj: any): void;

  export interface Experimental {
    MapControls: MapControls;
    autobind: typeof autobind;
  }

  export const experimental: Experimental;
}
