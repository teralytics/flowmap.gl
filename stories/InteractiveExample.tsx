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

import * as geoViewport from '@mapbox/geo-viewport';
import DeckGL from 'deck.gl';
import { FeatureCollection, GeometryObject } from 'geojson';
import * as _ from 'lodash';
import * as React from 'react';
import MapGL, { Viewport } from 'react-map-gl';
import FlowMapLayer, {
  Colors,
  DiffColors,
  DiffColorsLegend,
  FlowLayerPickingInfo,
  Location,
  LocationTotalsLegend,
  PickingType,
} from '../src';
import LegendBox from './LegendBox';

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
  selectedLocationIds?: string[];
}

export interface Props {
  flows: Flow[];
  initialViewport: Viewport;
  locations: FeatureCollection<GeometryObject, LocationProperties>;
  diff?: boolean;
  fp64?: boolean;
  showTotals: boolean;
  showLocationAreas: boolean;
  mapboxAccessToken: string;
  width: number;
  height: number;
}

const ESC_KEY = 27;

const colors: Colors = {
  flows: {
    max: '#137CBD',
  },
  locationAreas: {
    outline: 'rgba(92,112,128,0.5)',
    normal: 'rgba(187,187,187,0.5)',
    selected: 'rgba(217,130,43,0.5)',
  },
};

const diffColors: DiffColors = {
  positive: {
    flows: {
      max: '#e28740',
    },
  },
  negative: {
    flows: {
      max: '#0275b8',
    },
  },
  locationAreas: {
    outline: 'rgba(92,112,128,0.5)',
    normal: 'rgba(187,187,187,0.5)',
    selected: 'rgba(217,130,43,0.5)',
  },
};

const getLocationId = (loc: Location) => loc.properties.abbr;

function getNextSelectedLocationIds(
  selectedLocationIds: string[] | undefined,
  nextSelectedId: string,
): string[] | undefined {
  if (!selectedLocationIds || _.isEmpty(selectedLocationIds)) {
    return [nextSelectedId];
  }

  const nextSelectedIds = _.includes(selectedLocationIds, nextSelectedId)
    ? _.without(selectedLocationIds, nextSelectedId)
    : selectedLocationIds.concat(nextSelectedId);

  return _.isEmpty(nextSelectedIds) ? undefined : nextSelectedIds;
}

export default class InteractiveExample extends React.Component<Props, State> {
  // tslint:disable-next-line:typedef
  private highlightDebounced = _.debounce(this.highlight, 100);

  constructor(props: Props) {
    super(props);
    const { initialViewport } = props;
    this.state = {
      viewport: initialViewport,
    };
  }

  componentDidMount() {
    document.addEventListener('keydown', this.handleKeyDown);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  render() {
    const { width, height, mapboxAccessToken, diff } = this.props;
    const { viewport } = this.state;
    const flowMapLayer = this.getFlowMapLayer();
    return (
      <MapGL
        {...viewport}
        width={width}
        height={height}
        onViewportChange={this.handleChangeViewport}
        mapboxApiAccessToken={mapboxAccessToken}
      >
        <DeckGL {...viewport} width={width} height={height} layers={[flowMapLayer]} />
        <LegendBox top={10} left={10}>
          {diff && <DiffColorsLegend colors={flowMapLayer.props.colors as DiffColors} />}
          {diff && <hr />}
          <LocationTotalsLegend colors={flowMapLayer.props.colors} />
        </LegendBox>
      </MapGL>
    );
  }

  private getFlowMapLayer() {
    const { locations, flows, fp64, diff, showTotals, showLocationAreas } = this.props;
    const { highlight, selectedLocationIds } = this.state;
    return new FlowMapLayer({
      colors: diff ? diffColors : colors,
      getLocationId,
      selectedLocationIds,
      id: 'flow-map-layer',
      locations,
      flows,
      highlightedLocationId: highlight && highlight.type === HighlightType.LOCATION ? highlight.locationId : undefined,
      highlightedFlow: highlight && highlight.type === HighlightType.FLOW ? highlight.flow : undefined,
      getFlowMagnitude: f => f.count,
      showLocations: showLocationAreas,
      varyFlowColorByMagnitude: true,
      showTotals,
      onHover: this.handleFlowMapHover,
      onClick: this.handleFlowMapClick,
      fp64,
    });
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
        if (object) {
          const nextSelectedId = getLocationId(object);
          this.setState(state => ({
            ...state,
            selectedLocationIds: getNextSelectedLocationIds(state.selectedLocationIds, nextSelectedId),
          }));
        }
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
      this.setState({ selectedLocationIds: undefined });
    }
  };
}
