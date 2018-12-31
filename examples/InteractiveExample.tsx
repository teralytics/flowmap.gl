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

import DeckGL from 'deck.gl';
import { FeatureCollection, GeometryObject } from 'geojson';
import * as _ from 'lodash';
import * as React from 'react';
import { StaticMap, ViewState, ViewStateChangeInfo } from 'react-map-gl';
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
import * as d3Color from 'd3-color';

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
  viewState: ViewState;
  highlight?: Highlight;
  selectedLocationIds?: string[];
}

export interface Props {
  flows: Flow[];
  initialViewState: ViewState;
  locations: FeatureCollection<GeometryObject, LocationProperties>;
  diff?: boolean;
  showTotals: boolean;
  showLocationAreas: boolean;
  borderThickness?: number;
  borderColor?: string;
  mapboxAccessToken: string;
}

const ESC_KEY = 'Escape';

const colors: Colors = {
  flows: {
    max: '#137CBD',
  },
  locationAreas: {
    outline: 'rgba(92,112,128,0.5)',
    normal: 'rgba(187,187,187,0.5)',
    selected: 'rgba(217,130,43,0.5)',
  },
  dimmedOpacity: 0.75,
  borderColor: 'rgba(216, 216, 216, 242)',
};

const desaturate = (color: string, amount: number) => {
  const hcl = d3Color.hcl(color);
  hcl.c -= amount;
  return hcl.hex();
};

const getComplementary = (color: string) => {
  const hcl = d3Color.hcl(color);
  hcl.h = (hcl.h + 180) % 360;
  return hcl.hex();
};

const baseDiffColor = desaturate('#a76a50', 10);

const diffColors: DiffColors = {
  positive: {
    flows: {
      max: baseDiffColor,
    },
  },
  negative: {
    flows: {
      max: getComplementary(baseDiffColor),
    },
  },
  locationAreas: {
    outline: 'rgba(92,112,128,0.5)',
    normal: 'rgba(187,187,187,0.5)',
    selected: 'rgba(217,130,43,0.5)',
  },
  dimmedOpacity: 0.75,
  borderColor: 'rgba(200, 200, 200, 255)',
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
  readonly state: State = { viewState: this.props.initialViewState };
  private highlightDebounced = _.debounce(this.highlight, 100);

  componentDidMount() {
    document.addEventListener('keydown', this.handleKeyDown);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  render() {
    const { mapboxAccessToken, diff } = this.props;
    const flowMapLayer = this.getFlowMapLayer();
    return (
      <DeckGL
        style={{ mixBlendMode: 'multiply' }}
        layers={[flowMapLayer]}
        viewState={this.state.viewState}
        controller={true}
        onViewStateChange={this.handleViewStateChange}
        children={({ width, height, viewState }: any) => (
          <>
            <StaticMap mapboxApiAccessToken={mapboxAccessToken} width={width} height={height} viewState={viewState} />
            <LegendBox top={10} left={10}>
              {diff && <DiffColorsLegend colors={flowMapLayer.props.colors as DiffColors} />}
              {diff && <hr />}
              <LocationTotalsLegend colors={flowMapLayer.props.colors} />
            </LegendBox>
          </>
        )}
      />
    );
  }

  private getFlowMapLayer() {
    const { locations, flows, diff, showTotals, showLocationAreas, borderThickness, borderColor } = this.props;
    const { highlight, selectedLocationIds } = this.state;
    return new FlowMapLayer({
      colors: {
        ...(diff ? diffColors : colors),
        ...(borderColor && { borderColor }),
      },
      getLocationId,
      selectedLocationIds,
      id: 'flow-map-layer',
      locations,
      flows,
      highlightedLocationId: highlight && highlight.type === HighlightType.LOCATION ? highlight.locationId : undefined,
      highlightedFlow: highlight && highlight.type === HighlightType.FLOW ? highlight.flow : undefined,
      getFlowMagnitude: f => f.count,
      showLocationAreas,
      varyFlowColorByMagnitude: true,
      showTotals,
      borderThickness,
      onHover: this.handleFlowMapHover,
      onClick: this.handleFlowMapClick,
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

  private handleViewStateChange = ({ viewState }: ViewStateChangeInfo) => this.setState({ viewState });

  private handleKeyDown = (evt: Event) => {
    if (evt instanceof KeyboardEvent && evt.key === ESC_KEY) {
      this.setState({ selectedLocationIds: undefined });
    }
  };
}
