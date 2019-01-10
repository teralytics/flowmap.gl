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
import * as React from 'react';
import { StaticMap, ViewState, ViewStateChangeInfo } from 'react-map-gl';
import FlowMapLayer, {
  DiffColors,
  DiffColorsLegend,
  Flow,
  FlowAccessor,
  FlowLayerPickingInfo,
  LocationAccessor,
  Locations,
  LocationTotalsLegend,
  PickingType,
} from '../src';
import { colors, diffColors } from './colors';
import LegendBox from './LegendBox';

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
  locations: Locations;
  diff?: boolean;
  showTotals: boolean;
  showTotalsLegend?: boolean;
  showLocationAreas: boolean;
  borderThickness?: number;
  borderColor?: string;
  mapboxAccessToken: string;
  getLocationId: LocationAccessor<string>; // required as it is used within this component too, not just passed through
  getLocationCentroid?: LocationAccessor<[number, number]>;
  getFlowMagnitude?: FlowAccessor<number>;
  getFlowOriginId?: FlowAccessor<string>;
  getFlowDestId?: FlowAccessor<string>;
}

const ESC_KEY = 'Escape';

export default class InteractiveExample extends React.Component<Props, State> {
  readonly state: State = { viewState: this.props.initialViewState };

  componentDidMount() {
    document.addEventListener('keydown', this.handleKeyDown);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.handleKeyDown);
  }

  render() {
    const { mapboxAccessToken, diff, showTotalsLegend } = this.props;
    const flowMapLayer = this.getFlowMapLayer();
    return (
      <>
        <DeckGL
          style={{ mixBlendMode: 'multiply' }}
          layers={[flowMapLayer]}
          viewState={this.state.viewState}
          controller={true}
          onViewStateChange={this.handleViewStateChange}
          children={({ width, height, viewState }: any) => (
            <StaticMap mapboxApiAccessToken={mapboxAccessToken} width={width} height={height} viewState={viewState} />
          )}
        />

        {(diff || showTotalsLegend) && (
          <LegendBox bottom={35} left={10}>
            {diff && <DiffColorsLegend colors={flowMapLayer.props.colors as DiffColors} />}
            {diff && showTotalsLegend && <hr />}
            {showTotalsLegend && <LocationTotalsLegend colors={flowMapLayer.props.colors} />}
          </LegendBox>
        )}
      </>
    );
  }

  private getFlowMapLayer() {
    const {
      locations,
      flows,
      diff,
      showTotals,
      showLocationAreas,
      borderThickness,
      borderColor,
      getFlowOriginId,
      getFlowDestId,
      getLocationId,
      getLocationCentroid,
      getFlowMagnitude,
    } = this.props;
    const { highlight, selectedLocationIds } = this.state;
    return new FlowMapLayer({
      colors: {
        ...(diff ? diffColors : colors),
        ...(borderColor && { borderColor }),
      },
      selectedLocationIds,
      id: 'flow-map-layer',
      locations,
      flows,
      getLocationId,
      ...(getLocationCentroid && { getLocationCentroid }),
      ...(getFlowMagnitude && { getFlowMagnitude }),
      ...(getFlowOriginId && { getFlowOriginId }),
      ...(getFlowDestId && { getFlowDestId }),
      highlightedLocationId: highlight && highlight.type === HighlightType.LOCATION ? highlight.locationId : undefined,
      highlightedFlow: highlight && highlight.type === HighlightType.FLOW ? highlight.flow : undefined,
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
            locationId: this.props.getLocationId(object),
          });
        }
        break;
      }
      case PickingType.LOCATION_AREA: {
        this.highlight(undefined);
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
          this.setState(state => ({
            ...state,
            selectedLocationIds: [this.props.getLocationId(object)],
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
