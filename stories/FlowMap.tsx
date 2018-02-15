import * as geoViewport from '@mapbox/geo-viewport';
import DeckGL, { Layer } from 'deck.gl';
import { FeatureCollection, GeometryObject } from 'geojson';
import * as _ from 'lodash';
import * as React from 'react';
import MapGL, { Viewport } from 'react-map-gl';
import FlowMapLayer, { BaseColors, prepareColors } from '../src';
import { FlowLayerPickingInfo, Location, PickingType } from '../src/types';
import {BaseDiffColors} from "../src/utils";

export interface Flow {
  origin: string;
  dest: string;
  count: number;
}

export interface LocationProperties {
  abbr: string;
  name: string;
  no: number;
  centroid: [number, number];
}

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
  highlight?: Highlight;
  selectedLocationId?: string;
}

const MAPBOX_TOKEN = process.env.STORYBOOK_MapboxAccessToken;

const WIDTH = window.innerWidth;
const HEIGHT = window.innerHeight;
const BOUNDING_BOX = [5.9559111595, 45.8179931641, 10.4920501709, 47.808380127];
const ESC_KEY = 27;

const baseColors: BaseColors = {
  flows: '#137CBD',
  locations: {
    normal: 'rgba(187,187,187,0.5)',
    accent: 'rgba(217,130,43,0.5)',
    outlines: 'rgba(92,112,128,0.5)',
  },
};

const baseDiffColors: BaseDiffColors = {
  flows: {
    positive: '#e28740',
    negative: '#0275b8',
  },
  locations: {
    normal: 'rgba(187,187,187,0.5)',
    accent: 'rgba(217,130,43,0.5)',
    outlines: 'rgba(92,112,128,0.5)',
  },
};

const getLocationId = (loc: Location) => loc.properties.abbr;

export interface Props {
  flows: Flow[];
  locations: FeatureCollection<GeometryObject, LocationProperties>;
  diff?: boolean;
  fp64?: boolean;
}

class FlowMap extends React.Component<Props, State> {
  // tslint:disable-next-line:typedef
  private highlightDebounced = _.debounce(this.highlight, 100);

  constructor(props: Props) {
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
        <DeckGL {...viewport} width={WIDTH} height={HEIGHT} layers={this.getLayers()} />
      </MapGL>
    );
  }

  private getLayers(): Layer[] {
    const { locations, flows, fp64, diff } = this.props;
    const { highlight, selectedLocationId } = this.state;
    const flowMap = new FlowMapLayer({
      colors: prepareColors(diff ? baseDiffColors : baseColors),
      getLocationId,
      selectedLocationId,
      id: 'flow-map-layer',
      locations,
      flows,
      highlightedLocationId: highlight && highlight.type === HighlightType.LOCATION ? highlight.locationId : undefined,
      highlightedFlow: highlight && highlight.type === HighlightType.FLOW ? highlight.flow : undefined,
      getFlowMagnitude: f => f.count,
      showLocations: true,
      varyFlowColorByMagnitude: true,
      showTotals: true,
      onHover: this.handleFlowMapHover,
      onClick: this.handleFlowMapClick,
      fp64,
    });

    return [flowMap];
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

export default FlowMap;
