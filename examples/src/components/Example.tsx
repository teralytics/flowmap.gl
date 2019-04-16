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

import { Flow, FlowAccessors, Location, LocationAccessors } from '@flowmap.gl/core';
import FlowMap, { getViewStateForLocations, LegendBox, LocationTotalsLegend } from '@flowmap.gl/react';
import * as React from 'react';
import { ViewState } from 'react-map-gl';
import { mapboxAccessToken } from '../index';

const SHOW_TOP_FLOWS = 10000;

export interface Props extends FlowAccessors, LocationAccessors {
  locations: Location[];
  flows: Flow[];
  onViewStateChange?: (viewState: ViewState) => void;
}

export default class Example extends React.Component<Props> {
  private readonly initialViewState: ViewState;

  constructor(props: Props) {
    super(props);
    const { locations, getLocationCentroid } = props;
    this.initialViewState = getViewStateForLocations(locations, getLocationCentroid, [
      window.innerWidth,
      window.innerHeight,
    ]);
  }

  render() {
    const { flows, locations, getLocationId, getLocationCentroid, getFlowMagnitude, onViewStateChange } = this.props;
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
          onViewStateChange={onViewStateChange}
        />
        <LegendBox bottom={35} left={10}>
          <LocationTotalsLegend />
        </LegendBox>
        <LegendBox bottom={35} right={10}>
          {`Showing ${flows.length > SHOW_TOP_FLOWS ? `top ${SHOW_TOP_FLOWS} of` : ''} ${flows.length} flows. `}
        </LegendBox>
      </>
    );
  }
}
