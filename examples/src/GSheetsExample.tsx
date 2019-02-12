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

import FlowMap, { getViewStateForLocations, LegendBox, LocationTotalsLegend } from '@flowmap.gl/react';
import * as React from 'react';
import { mapboxAccessToken } from '.';
import { pipe, withFetchCsv, withStats } from './hocs';

interface Location {
  id: string;
  lon: string;
  lat: string;
  name: string;
}

interface Flow {
  origin: string;
  dest: string;
  count: string;
}

const getFlowMagnitude = (flow: Flow) => +flow.count;
const getFlowOriginId = (flow: Flow) => flow.origin;
const getFlowDestId = (flow: Flow) => flow.dest;
const getLocationId = (loc: Location) => loc.id;
const getLocationCentroid = (location: Location): [number, number] => [+location.lon, +location.lat];

const SHOW_TOP_FLOWS = 10000;

const GSheetsExample = ({ sheetKey }: { sheetKey: string }) => {
  const Comp = pipe(
    withStats,
    withFetchCsv('locations', `https://docs.google.com/spreadsheets/d/${sheetKey}/gviz/tq?tqx=out:csv&sheet=locations`),
    withFetchCsv('flows', `https://docs.google.com/spreadsheets/d/${sheetKey}/gviz/tq?tqx=out:csv&sheet=flows`),
  )(({ locations, flows }: { locations: Location[]; flows: Flow[] }) => {
    return (
      <>
        <FlowMap
          colors={{
            flows: { min: '#fff' },
          }}
          initialViewState={getViewStateForLocations(locations, getLocationCentroid, [
            window.innerWidth,
            window.innerHeight,
          ])}
          showTotals={true}
          showLocationAreas={false}
          showOnlyTopFlows={SHOW_TOP_FLOWS}
          flows={flows}
          locations={locations}
          mapboxAccessToken={mapboxAccessToken}
          getLocationId={getLocationId}
          getFlowOriginId={getFlowOriginId}
          getFlowDestId={getFlowDestId}
          getLocationCentroid={getLocationCentroid}
          getFlowMagnitude={getFlowMagnitude}
        />
        <LegendBox bottom={35} left={10}>
          <LocationTotalsLegend />
        </LegendBox>
        <LegendBox bottom={35} right={10}>
          {`Showing ${flows.length > SHOW_TOP_FLOWS ? `top ${SHOW_TOP_FLOWS} of` : ''} ${flows.length} flows. `}
          <a
            href={`https://docs.google.com/spreadsheets/d/${sheetKey}/edit?usp=sharing`}
            target="_blank"
            rel="noopener"
          >
            Data source
          </a>
        </LegendBox>
      </>
    );
  });
  return <Comp />;
};

export default GSheetsExample;
