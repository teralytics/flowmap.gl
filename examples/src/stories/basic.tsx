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

import { Flow, Location } from '@flowmap.gl/core';
import FlowMap, { DiffColorsLegend, getViewStateForFeatures, LegendBox, LocationTotalsLegend } from '@flowmap.gl/react';
import { storiesOf } from '@storybook/react';
import * as d3scaleChromatic from 'd3-scale-chromatic';
import React from 'react';
import NonInteractiveExample from '../components/NonInteractiveExample';
import { mapboxAccessToken } from '../index';
import pipe from '../utils/pipe';
import { withFetchJson } from '../utils/withFetch';
import withStats from '../utils/withStats';

const getLocationId = (loc: Location) => loc.properties.abbr;

storiesOf('Basic', module)
  .add(
    'basic',
    pipe(
      withStats,
      withFetchJson('locations', './data/locations.json'),
      withFetchJson('flows', './data/flows-2016.json'),
    )(({ locations, flows }: any) => (
      <>
        <FlowMap
          getLocationId={getLocationId}
          flows={flows}
          locations={locations}
          initialViewState={getViewStateForFeatures(locations, [window.innerWidth, window.innerHeight])}
          mapboxAccessToken={mapboxAccessToken}
        />
        <LegendBox bottom={35} left={10}>
          <LocationTotalsLegend />
        </LegendBox>
      </>
    )),
  )
  .add(
    'custom flow color scheme',
    pipe(
      withStats,
      withFetchJson('locations', './data/locations.json'),
      withFetchJson('flows', './data/flows-2016.json'),
    )(({ locations, flows }: any) => {
      const colors = {
        flows: {
          scheme: d3scaleChromatic.schemeGnBu[d3scaleChromatic.schemeGnBu.length - 1] as string[],
        },
      };
      return (
        <>
          <FlowMap
            colors={colors}
            getLocationId={getLocationId}
            flows={flows}
            locations={locations}
            initialViewState={getViewStateForFeatures(locations, [window.innerWidth, window.innerHeight])}
            mapboxAccessToken={mapboxAccessToken}
          />
          <LegendBox bottom={35} left={10}>
            <LocationTotalsLegend colors={colors} />
          </LegendBox>
        </>
      );
    }),
  )
  .add(
    'custom dark mode color scheme',
    pipe(
      withStats,
      withFetchJson('locations', './data/locations.json'),
      withFetchJson('flows', './data/flows-2016.json'),
    )(({ locations, flows }: any) => {
      const scheme = (d3scaleChromatic.schemeGnBu[d3scaleChromatic.schemeGnBu.length - 1] as string[])
        .slice()
        .reverse();
      const colors = {
        darkMode: true,
        flows: {
          scheme,
        },
        locationAreas: {
          normal: '#334',
        },
        outlineColor: '#000',
      };
      return (
        <>
          <FlowMap
            colors={colors}
            mapStyle="mapbox://styles/mapbox/dark-v10"
            mixBlendMode="screen"
            getLocationId={getLocationId}
            flows={flows}
            locations={locations}
            initialViewState={getViewStateForFeatures(locations, [window.innerWidth, window.innerHeight])}
            mapboxAccessToken={mapboxAccessToken}
          />
          <LegendBox bottom={35} left={10} style={{ backgroundColor: '#000', color: '#fff' }}>
            <LocationTotalsLegend colors={colors} />
          </LegendBox>
        </>
      );
    }),
  )
  .add(
    'animated',
    pipe(
      withStats,
      withFetchJson('locations', './data/locations.json'),
      withFetchJson('flows', './data/flows-2016.json'),
    )(({ locations, flows }: any) => (
      <FlowMap
        animate={true}
        getLocationId={getLocationId}
        flows={flows}
        locations={locations}
        initialViewState={getViewStateForFeatures(locations, [window.innerWidth, window.innerHeight])}
        mapboxAccessToken={mapboxAccessToken}
      />
    )),
  )
  .add(
    'only top 100 flows',
    pipe(
      withStats,
      withFetchJson('locations', './data/locations.json'),
      withFetchJson('flows', './data/flows-2016.json'),
    )(({ locations, flows }: any) => (
      <FlowMap
        getLocationId={getLocationId}
        showTotals={true}
        showOnlyTopFlows={100}
        showLocationAreas={true}
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
      withFetchJson('locations', './data/locations.json'),
      withFetchJson('flows', './data/flows-2016.json'),
    )(({ locations, flows }: any) => (
      <FlowMap
        colors={{ outlineColor: '#fff' }}
        getLocationId={getLocationId}
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
      withFetchJson('locations', './data/locations.json'),
      withFetchJson('flows', './data/flows-2016.json'),
    )(({ locations, flows }: any) => (
      <FlowMap
        getLocationId={getLocationId}
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
    'custom zone totals',
    pipe(
      withStats,
      withFetchJson('locations', './data/locations.json'),
      withFetchJson('flows', './data/flows-2016.json'),
    )(({ locations, flows }: any) => {
      const locationIds = locations.features.map(getLocationId).reverse();
      const getTotal = (location: Location) => 0; // Math.pow(locationIds.indexOf(getLocationId(location)), 10);
      return (
        <>
          <FlowMap
            getLocationId={getLocationId}
            flows={[]}
            locations={locations}
            getLocationTotalIn={getTotal}
            getLocationTotalOut={getTotal}
            getLocationTotalWithin={getTotal}
            initialViewState={getViewStateForFeatures(locations, [window.innerWidth, window.innerHeight])}
            mapboxAccessToken={mapboxAccessToken}
          />
          <LegendBox bottom={35} left={10}>
            <LocationTotalsLegend />
          </LegendBox>
        </>
      );
    }),
  )
  .add(
    'flow color override',
    pipe(
      withStats,
      withFetchJson('locations', './data/locations.json'),
      withFetchJson('flows', './data/flows-2016.json'),
    )(({ locations, flows }: any) => (
      <FlowMap
        getLocationId={getLocationId}
        flows={flows}
        locations={locations}
        initialViewState={getViewStateForFeatures(locations, [window.innerWidth, window.innerHeight])}
        mapboxAccessToken={mapboxAccessToken}
        getFlowColor={(f: Flow) => {
          if (f.origin === 'ZH' && f.dest === 'AG') {
            return 'orange';
          }
          return undefined;
        }}
      />
    )),
  )
  .add(
    'custom outlines',
    pipe(
      withStats,
      withFetchJson('locations', './data/locations.json'),
      withFetchJson('flows', './data/flows-2016.json'),
    )(({ locations, flows }: any) => (
      <FlowMap
        colors={{
          outlineColor: '#64e9f9',
        }}
        getLocationId={getLocationId}
        showTotals={true}
        showLocationAreas={true}
        flows={flows}
        locations={locations}
        initialViewState={getViewStateForFeatures(locations, [window.innerWidth, window.innerHeight])}
        outlineThickness={5}
        mapboxAccessToken={mapboxAccessToken}
      />
    )),
  )
  .add(
    'multiselect',
    pipe(
      withStats,
      withFetchJson('locations', './data/locations.json'),
      withFetchJson('flows', './data/flows-2016.json'),
    )(({ locations, flows }: any) => (
      <FlowMap
        getLocationId={getLocationId}
        flows={flows}
        locations={locations}
        multiselect={true}
        initialViewState={getViewStateForFeatures(locations, [window.innerWidth, window.innerHeight])}
        mapboxAccessToken={mapboxAccessToken}
      />
    )),
  )
  .add(
    'non-interactive',
    pipe(
      withStats,
      withFetchJson('locations', './data/locations.json'),
      withFetchJson('flows', './data/flows-2016.json'),
    )(({ locations, flows }: any) => (
      <NonInteractiveExample
        flows={flows}
        locations={locations}
        initialViewState={getViewStateForFeatures(locations, [window.innerWidth, window.innerHeight])}
        mapboxAccessToken={mapboxAccessToken}
      />
    )),
  )
  .add(
    'difference mode',
    pipe(
      withStats,
      withFetchJson('locations', './data/locations.json'),
      withFetchJson('flows', './data/flows-diff-2015-2016.json'),
    )(({ locations, flows }: any) => (
      <>
        <FlowMap
          diffMode={true}
          getLocationId={getLocationId}
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
  )
  .add('custom legend', () => (
    <>
      <LegendBox bottom={35} left={10}>
        <DiffColorsLegend positiveText="+ diff" negativeText="- diff" />
        <hr />
        <LocationTotalsLegend
          diff={true}
          aboutEqualText="equal"
          moreOutgoingText="> outgoing"
          moreIncomingText="> incoming"
        />
      </LegendBox>
    </>
  ))
  .add(
    'maxFlowThickness',
    pipe(
      withStats,
      withFetchJson('locations', './data/locations.json'),
      withFetchJson('flows', './data/flows-2016.json'),
    )(({ locations, flows }: any) => {
      return (
        <>
          <FlowMap
            getLocationId={getLocationId}
            maxFlowThickness={15}
            flows={flows}
            locations={locations}
            initialViewState={getViewStateForFeatures(locations, [window.innerWidth, window.innerHeight])}
            mapboxAccessToken={mapboxAccessToken}
          />
          <LegendBox bottom={35} left={10}>
            <LocationTotalsLegend />
          </LegendBox>
        </>
      );
    }),
  )
  .add(
    'maxFlowThickness animated',
    pipe(
      withStats,
      withFetchJson('locations', './data/locations.json'),
      withFetchJson('flows', './data/flows-2016.json'),
    )(({ locations, flows }: any) => {
      return (
        <>
          <FlowMap
            getLocationId={getLocationId}
            maxFlowThickness={15}
            flows={flows}
            animate={true}
            locations={locations}
            initialViewState={getViewStateForFeatures(locations, [window.innerWidth, window.innerHeight])}
            mapboxAccessToken={mapboxAccessToken}
          />
          <LegendBox bottom={35} left={10}>
            <LocationTotalsLegend />
          </LegendBox>
        </>
      );
    }),
  )
  .add(
    'minPickableFlowThickness',
    pipe(
      withStats,
      withFetchJson('locations', './data/locations.json'),
      withFetchJson('flows', './data/flows-2016.json'),
    )(({ locations, flows }: any) => {
      return (
        <>
          <FlowMap
            getLocationId={getLocationId}
            minPickableFlowThickness={1}
            flows={flows}
            locations={locations}
            initialViewState={getViewStateForFeatures(locations, [window.innerWidth, window.innerHeight])}
            mapboxAccessToken={mapboxAccessToken}
          />
          <LegendBox bottom={35} left={10}>
            <LocationTotalsLegend />
          </LegendBox>
        </>
      );
    }),
  )
  .add(
    'minPickableFlowThickness animated',
    pipe(
      withStats,
      withFetchJson('locations', './data/locations.json'),
      withFetchJson('flows', './data/flows-2016.json'),
    )(({ locations, flows }: any) => {
      return (
        <>
          <FlowMap
            getLocationId={getLocationId}
            minPickableFlowThickness={1}
            animate={true}
            flows={flows}
            locations={locations}
            initialViewState={getViewStateForFeatures(locations, [window.innerWidth, window.innerHeight])}
            mapboxAccessToken={mapboxAccessToken}
          />
          <LegendBox bottom={35} left={10}>
            <LocationTotalsLegend />
          </LegendBox>
        </>
      );
    }),
  );
