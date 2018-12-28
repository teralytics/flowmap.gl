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
import { StaticMap } from 'react-map-gl';
import FlowMapLayer, { LocationTotalsLegend } from '../src';
import { colors } from './colors';
import { fitLocationsInView } from './fitInView';
import {pipe, withFetchCsv, withStats} from './hocs';
import { mapboxAccessToken } from './index';
import LegendBox from './LegendBox';

const GOOGLE_SHEET_KEY = `1IQ0txD09cJ8wsQRSux5AoZfG6eIM-cx6RvVfszZ_ScE`;

interface Location {
  station_id: string;
  longitude: string;
  latitude: string;
  name: string;
}

interface Flow {
  start_station_id: string;
  end_station_id: string;
  count: string;
}

export default pipe(
  withStats,
  withFetchCsv(
    'locations',
    `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_KEY}/gviz/tq?tqx=out:csv&sheet=stations`,
  ),
  withFetchCsv('flows', `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_KEY}/gviz/tq?tqx=out:csv&sheet=flows`),
)(({ locations, flows }: { locations: Location[]; flows: Flow[] }) => {
  const getLocationCentroid = (location: Location): [number, number] => [+location.longitude, +location.latitude];
  const initialViewState = fitLocationsInView(locations, getLocationCentroid, [window.innerWidth, window.innerHeight]);
  return (
    <>
      <DeckGL
        style={{ mixBlendMode: 'multiply' }}
        controller={true}
        initialViewState={initialViewState}
        layers={[
          new FlowMapLayer({
            id: 'flow-map-layer',
            colors,
            locations,
            flows,
            getLocationCentroid,
            getFlowMagnitude: (flow: Flow) => +flow.count,
            getFlowOriginId: (flow: Flow) => flow.start_station_id,
            getFlowDestId: (flow: Flow) => flow.end_station_id,
            getLocationId: (loc: Location) => loc.station_id,
            varyFlowColorByMagnitude: true,
            showTotals: true,
          }),
        ]}
        children={({ width, height, viewState }: any) => (
          <>
            <StaticMap mapboxApiAccessToken={mapboxAccessToken} width={width} height={height} viewState={viewState} />
            <LegendBox bottom={35} left={10}>
              <LocationTotalsLegend colors={colors} />
            </LegendBox>
          </>
        )}
      />
      <LegendBox bottom={35} right={10}>
        {`Showing ${flows.length} flows. `}
        <a
          href={`https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_KEY}/edit?usp=sharing`}
          target="_blank"
          rel="noopener"
        >
          Data source
        </a>
      </LegendBox>
    </>
  );
});
