// tslint:disable:max-classes-per-file
declare module 'react-map-gl' {
  import * as React from 'react';

  export interface StaticMapProps {
    mapboxApiAccessToken?: string;
    preserveDrawingBuffer?: boolean;
    attributionControl?: boolean;
    mapStyle?: string | {};
    preventStyleDiffing?: boolean;
    visible?: boolean;
    width: number;
    height: number;
    longitude: number;
    latitude: number;
    zoom: number;
    bearing?: number;
    pitch?: number;
    altitude?: number;
    onLoad?: () => void;
  }

  // tslint:disable-next-line:no-any
  export type MapboxMap = any;

  export class StaticMap extends React.PureComponent<StaticMapProps> {
    getMap(): MapboxMap;
  }

  export interface InteractiveMapState {
    isDragging: boolean;
    isHovering: boolean;
  }

  export interface MapEvent {
    lngLat: [number, number];
    features: Array<{}>;
  }

  export interface Viewport {
    latitude: number;
    longitude: number;
    zoom: number;
    bearing: number;
    pitch: number;
  }

  export interface InteractiveMapProps extends StaticMapProps {
    maxZoom?: number;
    minZoom?: number;
    maxPitch?: number;
    minPitch?: number;
    onViewportChange?: (viewport: Viewport) => void;
    scrollZoom?: boolean;
    dragPan?: boolean;
    dragRotate?: boolean;
    doubleClickZoom?: boolean;
    touchZoomRotate?: boolean;
    onHover?: (event: MapEvent) => void;
    onClick?: (event: MapEvent) => void;
    clickRadius?: number;
    getCursor?: (state: InteractiveMapState) => void;
    visibilityConstraints?: {
      minZoom: number;
      maxZoom: number;
      minPitch: number;
      maxPitch: number;
    };
    mapControls?: {
      events: string[];
      handleEvent: (event: HammerInput, context: {}) => void;
    };
  }

  class InteractiveMap extends React.PureComponent<InteractiveMapProps, InteractiveMapState> {
    getMap(): MapboxMap;
  }

  export default InteractiveMap;

  export { InteractiveMap };

  class MapControls {
    events: string[];
    handleEvent(event: HammerInput): void;
  }

  // tslint:disable-next-line:class-name
  export interface experimental {
    MapControls: MapControls,
  }
}
