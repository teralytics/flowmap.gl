/*
 * Copyright 2019 Teralytics
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

import { Flow, FlowAccessors, FlowLayerPickingInfo, Location, LocationAccessors } from '@flowmap.gl/core';
import FlowMap, { getViewStateForLocations, Highlight, LegendBox, LocationTotalsLegend } from '@flowmap.gl/react';
import React from 'react';
import { ViewState } from '@flowmap.gl/core';
import { mapboxAccessToken } from '../index';

const SHOW_TOP_FLOWS = 10000;

export interface Props extends FlowAccessors, LocationAccessors {
  locations: Location[];
  flows: Flow[];
  onViewStateChange?: (viewState: ViewState) => void;
}

interface State {
  tooltip: FlowLayerPickingInfo | undefined;
}

const tooltipStyle: React.CSSProperties = {
  position: 'absolute',
  pointerEvents: 'none',
  zIndex: 1,
  background: '#125',
  color: '#fff',
  fontSize: 9,
  borderRadius: 4,
  padding: 5,
  maxWidth: 300,
  maxHeight: 300,
  overflow: 'hidden',
  boxShadow: '2px 2px 4px #ccc',
};

export default class Example extends React.Component<Props, State> {
  state: State = {
    tooltip: undefined,
  };
  private readonly initialViewState: ViewState;

  constructor(props: Props) {
    super(props);
    const { locations, getLocationCentroid } = props;
    this.initialViewState = getViewStateForLocations(locations, getLocationCentroid, [
      window.innerWidth,
      window.innerHeight,
    ]);
  }

  handleViewStateChange = (viewState: ViewState) => {
    const { onViewStateChange } = this.props;
    if (onViewStateChange) {
      onViewStateChange(viewState);
    }
    const { tooltip } = this.state;
    if (tooltip) {
      this.setState({ tooltip: undefined });
    }
  };

  handleHighlight = (highlight: Highlight | undefined, info: FlowLayerPickingInfo | undefined) => {
    if (!info) {
      this.setState({ tooltip: undefined });
    }
    this.setState({
      tooltip: info,
    });
  };

  renderTooltip() {
    const { tooltip } = this.state;
    if (!tooltip) {
      return null;
    }
    const { object, x, y } = tooltip;
    if (!object) {
      return null;
    }
    return (
      <pre
        style={{
          ...tooltipStyle,
          left: x,
          top: y,
        }}
      >
        {JSON.stringify(object, null, 2)}
      </pre>
    );
  }

  render() {
    const { flows, locations, getLocationId, getLocationCentroid, getFlowMagnitude } = this.props;
    return (
      <>
        <FlowMap
          initialViewState={this.initialViewState}
          showTotals={true}
          showLocationAreas={false}
          showOnlyTopFlows={SHOW_TOP_FLOWS}
          flows={flows}
          locations={locations}
          mapboxAccessToken={mapboxAccessToken}
          getLocationId={getLocationId}
          getLocationCentroid={getLocationCentroid}
          getFlowMagnitude={getFlowMagnitude}
          onViewStateChange={this.handleViewStateChange}
          onHighlighted={this.handleHighlight}
        />
        <LegendBox bottom={35} left={10}>
          <LocationTotalsLegend />
        </LegendBox>
        <LegendBox bottom={35} right={10}>
          {`Showing ${flows.length > SHOW_TOP_FLOWS ? `top ${SHOW_TOP_FLOWS} of` : ''} ${flows.length} flows. `}
        </LegendBox>
        {this.renderTooltip()}
      </>
    );
  }
}
