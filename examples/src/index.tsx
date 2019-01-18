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

import FlowMapLayer, { getColorsRGBA, getDiffColorsRGBA } from '@flowmap.gl/core';
import FlowMap, { DiffColorsLegend, getViewStateForFeatures, LegendBox, LocationTotalsLegend } from '@flowmap.gl/react';
import { storiesOf } from '@storybook/react';
import * as React from 'react';
import GSheetsExample from './GSheetsExample';
import { pipe, withFetchJson, withStats } from './hocs';
import StaticExample from './StaticExample';

export const mapboxAccessToken = process.env.MapboxAccessToken || '';

storiesOf('FlowMapLayer', module)
  .add(
    'basic',
    pipe(
      withStats,
      withFetchJson('locations', '/data/locations.json'),
      withFetchJson('flows', '/data/flows-2016.json'),
    )(({ locations, flows }: any) => (
      <FlowMap
        getLocationId={(loc: any) => loc.properties.abbr}
        getFlowMagnitude={(flow: any) => flow.count}
        flows={flows}
        locations={locations}
        initialViewState={getViewStateForFeatures(locations, [window.innerWidth, window.innerHeight])}
        mapboxAccessToken={mapboxAccessToken}
      />
    )),
  )
  .add(
    'no location areas',
    pipe(
      withStats,
      withFetchJson('locations', '/data/locations.json'),
      withFetchJson('flows', '/data/flows-2016.json'),
    )(({ locations, flows }: any) => (
      <FlowMap
        colors={{ borderColor: '#fff' }}
        getLocationId={(loc: any) => loc.properties.abbr}
        getFlowMagnitude={(flow: any) => flow.count}
        showTotals={true}
        showLocationAreas={false}
        flows={flows}
        locations={locations}
        initialViewState={getViewStateForFeatures(locations, [window.innerWidth, window.innerHeight])}
        mapboxAccessToken={mapboxAccessToken}
      />
    )),
  )
  .add(
    'no location totals',
    pipe(
      withStats,
      withFetchJson('locations', '/data/locations.json'),
      withFetchJson('flows', '/data/flows-2016.json'),
    )(({ locations, flows }: any) => (
      <FlowMap
        getLocationId={(loc: any) => loc.properties.abbr}
        getFlowMagnitude={(flow: any) => flow.count}
        showTotals={false}
        showLocationAreas={true}
        flows={flows}
        locations={locations}
        initialViewState={getViewStateForFeatures(locations, [window.innerWidth, window.innerHeight])}
        mapboxAccessToken={mapboxAccessToken}
      />
    )),
  )
  .add(
    'non-interactive',
    pipe(
      withStats,
      withFetchJson('locations', '/data/locations.json'),
      withFetchJson('flows', '/data/flows-2016.json'),
    )(({ locations, flows }: any) => (
      <StaticExample
        flows={flows}
        locations={locations}
        initialViewState={getViewStateForFeatures(locations, [window.innerWidth, window.innerHeight])}
        mapboxAccessToken={mapboxAccessToken}
      />
    )),
  )
  .add(
    'custom borders',
    pipe(
      withStats,
      withFetchJson('locations', '/data/locations.json'),
      withFetchJson('flows', '/data/flows-2016.json'),
    )(({ locations, flows }: any) => (
      <FlowMap
        colors={{
          borderColor: '#64e9f9',
        }}
        getLocationId={(loc: any) => loc.properties.abbr}
        getFlowMagnitude={(flow: any) => flow.count}
        showTotals={true}
        showLocationAreas={true}
        flows={flows}
        locations={locations}
        initialViewState={getViewStateForFeatures(locations, [window.innerWidth, window.innerHeight])}
        borderThickness={5}
        mapboxAccessToken={mapboxAccessToken}
      />
    )),
  )
  .add(
    'multiselect',
    pipe(
      withStats,
      withFetchJson('locations', '/data/locations.json'),
      withFetchJson('flows', '/data/flows-2016.json'),
    )(({ locations, flows }: any) => (
      <FlowMap
        getLocationId={(loc: any) => loc.properties.abbr}
        getFlowMagnitude={(flow: any) => flow.count}
        flows={flows}
        locations={locations}
        multiselect={true}
        initialViewState={getViewStateForFeatures(locations, [window.innerWidth, window.innerHeight])}
        mapboxAccessToken={mapboxAccessToken}
      />
    )),
  )
  .add(
    'difference mode',
    pipe(
      withStats,
      withFetchJson('locations', '/data/locations.json'),
      withFetchJson('flows', '/data/flows-diff-2015-2016.json'),
    )(({ locations, flows }: any) => (
      <>
        <FlowMap
          diffMode={true}
          getLocationId={(loc: any) => loc.properties.abbr}
          getFlowMagnitude={(flow: any) => flow.count}
          showTotals={true}
          showLocationAreas={true}
          flows={flows}
          locations={locations}
          initialViewState={getViewStateForFeatures(locations, [window.innerWidth, window.innerHeight])}
          mapboxAccessToken={mapboxAccessToken}
        />
        <LegendBox bottom={35} left={10}>
          <DiffColorsLegend />
          <hr />
          <LocationTotalsLegend diff={true} />
        </LegendBox>
      </>
    )),
  );

storiesOf('Other datasets', module)
  .add('London bicycle hire', () => <GSheetsExample sheetKey="1Z6dVVFFrdooHIs8xnJ_O7eM5bhS5KscCi7G_k0jUNDI" />)
  .add('NYC citibike', () => <GSheetsExample sheetKey="1Aum0anWxPx6bHyfcFXWCCTE8u0xtfenIls_kPAJEDIA" />)
  .add('Chicago taxis', () => <GSheetsExample sheetKey="1fhX98NFv5gAkkjB2YFCm50-fplFpmWVAZby3dmm9cgQ" />);
