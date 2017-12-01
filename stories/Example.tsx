import * as geoViewport from '@mapbox/geo-viewport';
import DeckGL, { Layer } from 'deck.gl';
import { Feature, FeatureCollection, GeometryObject } from 'geojson';
import * as _ from 'lodash';
import * as React from 'react';
import MapGL, { Viewport } from 'react-map-gl';
import FlowMapLayer, { FlowLayerPickingInfo, PickingType } from '../src';

// tslint:disable-next-line:no-var-requires
const flowsData = require('./data/flows.json');
// tslint:disable-next-line:no-var-requires
const locationsData = require('./data/locations.json');

export interface Flow {
  origin: string;
  dest: string;
  magnitude: number;
}

export interface LocationProperties {
  abbr: string;
  name: string;
  no: number;
  centroid: [number, number];
}

export type Location = Feature<GeometryObject, LocationProperties>;

export const enum HighlightType {
  LOCATION = 'location',
  FLOW = 'flow',
}

export interface LocationHighlight {
  type: HighlightType.LOCATION;
  locationId: string;
}

export interface FlowHighlight {
  type: HighlightType.FLOW;
  flow: Flow;
}

export type Highlight = LocationHighlight | FlowHighlight;

export interface State {
  viewport: Viewport;
  // tslint:disable-next-line:no-any
  locations: FeatureCollection<GeometryObject, LocationProperties>;
  flows: Flow[];
  highlight?: Highlight;
  selectedLocationId?: string;
}

const MAPBOX_TOKEN = process.env.STORYBOOK_MapboxAccessToken;

const WIDTH = window.innerWidth;
const HEIGHT = window.innerHeight;
const BOUNDING_BOX = [5.9559111595, 45.8179931641, 10.4920501709, 47.808380127];
const ESC_KEY = 27;

const getLocationId = (l: Location) => l.properties.abbr;
const getLocationCentroid = (l: Location) => l.properties.centroid;
const getFlowOriginId = (f: Flow) => f.origin;
const getFlowDestId = (f: Flow) => f.dest;
const getFlowMagnitude = (f: Flow) => f.magnitude;

class Example extends React.Component<{}, State> {
  // tslint:disable-next-line:typedef
  private highlightDebounced = _.debounce(this.highlight, 100);

  constructor(props: {}) {
    super(props);

    const { center: [longitude, latitude], zoom } = geoViewport.viewport(
      BOUNDING_BOX,
      [WIDTH, HEIGHT],
      undefined,
      undefined,
      512,
    );

    this.state = {
      viewport: {
        longitude,
        latitude,
        zoom,
        bearing: 0,
        pitch: 0,
      },
      locations: locationsData,
      flows: flowsData,
    };
  }

  componentWillMount() {
    document.addEventListener('keydown', this.handleKeyDown);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  render() {
    const { viewport } = this.state;
    return (
      <MapGL
        {...viewport}
        width={WIDTH}
        height={HEIGHT}
        onViewportChange={this.handleChangeViewport}
        mapboxApiAccessToken={MAPBOX_TOKEN}
      >
        <DeckGL {...viewport} width={WIDTH} height={HEIGHT} layers={this.getDeckGlLayers()} />
      </MapGL>
    );
  }

  private getDeckGlLayers(): Layer[] {
    const { locations, flows, highlight, selectedLocationId } = this.state;
    if (!locations || !flows) {
      return [];
    }

    const flowMap = new FlowMapLayer({
      id: 'flow-map-layer',
      baseColor: '#0084c1',
      locations,
      flows,
      getLocationId,
      getLocationCentroid,
      getFlowOriginId,
      getFlowDestId,
      getFlowMagnitude,
      selectedLocationId,
      highlightedLocationId: highlight && highlight.type === HighlightType.LOCATION ? highlight.locationId : undefined,
      highlightedFlow: highlight && highlight.type === HighlightType.FLOW ? highlight.flow : undefined,
      showLocations: true,
      varyFlowColorByMagnitude: true,
      showTotals: true,
      onHover: this.handleFlowMapHover,
      onClick: this.handleFlowMapClick,
    });

    return [flowMap] as Layer[];
  }

  private highlight(highlight: Highlight | undefined) {
    this.setState({ highlight });
    this.highlightDebounced.cancel();
  }

  private handleFlowMapHover = ({ type, object }: FlowLayerPickingInfo) => {
    switch (type) {
      case PickingType.FLOW: {
        if (!object) {
          this.highlight(undefined);
        } else {
          this.highlight({
            type: HighlightType.FLOW,
            flow: object,
          });
        }
        break;
      }
      case PickingType.LOCATION: {
        if (!object) {
          this.highlight(undefined);
        } else {
          this.highlight({
            type: HighlightType.LOCATION,
            locationId: getLocationId(object),
          });
        }
        break;
      }
      case PickingType.LOCATION_AREA: {
        if (!object) {
          this.highlightDebounced(undefined);
        } else {
          this.highlightDebounced({
            type: HighlightType.LOCATION,
            locationId: getLocationId(object),
          });
        }
        break;
      }
    }
  };

  private handleFlowMapClick = ({ type, object }: FlowLayerPickingInfo) => {
    switch (type) {
      case PickingType.LOCATION:
      // fall through
      case PickingType.LOCATION_AREA: {
        const { selectedLocationId } = this.state;
        const nextSelectedId = object ? getLocationId(object) : undefined;
        this.setState({
          selectedLocationId: nextSelectedId === selectedLocationId ? undefined : nextSelectedId,
        });
        break;
      }
    }
  };

  private handleChangeViewport = (viewport: Viewport) =>
    this.setState({
      viewport: {
        ...this.state.viewport,
        ...viewport,
      },
    });

  private handleKeyDown = (evt: Event) => {
    if (evt instanceof KeyboardEvent && evt.keyCode === ESC_KEY) {
      this.setState({
        selectedLocationId: undefined,
      });
    }
  };
}

export default Example;
