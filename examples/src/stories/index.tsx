/*
 * Copyright 2020 Teralytics
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

import FlowMapLayer, { Flow, Location } from '@flowmap.gl/core';
import FlowMap, { DiffColorsLegend, getViewStateForFeatures, LegendBox, LocationTotalsLegend } from '@flowmap.gl/react';
import { storiesOf } from '@storybook/react';
import * as d3scaleChromatic from 'd3-scale-chromatic';
import React from 'react';
import { mapboxAccessToken } from '../index';
import pipe from '../utils/pipe';
import { withFetchJson } from '../utils/withFetch';
import withStats from '../utils/withStats';
import ClusteringExample from '../components/ClusteringExample';
import withSheetsFetch from '../utils/withSheetsFetch';
import Example from '../components/Example';
import { DeckGL } from '@deck.gl/react';
import { StaticMap } from 'react-map-gl';

const getLocationId = (loc: Location) => loc.properties.abbr;
const DARK_COLORS = {
  darkMode: true,
  flows: {
    scheme: [
      'rgb(0, 22, 61)',
      'rgb(0, 27, 62)',
      'rgb(0, 36, 68)',
      'rgb(0, 48, 77)',
      'rgb(3, 65, 91)',
      'rgb(48, 87, 109)',
      'rgb(85, 115, 133)',
      'rgb(129, 149, 162)',
      'rgb(179, 191, 197)',
      'rgb(240, 240, 240)',
    ],
  },
  locationAreas: {
    normal: '#334',
  },
  outlineColor: '#000',
};

storiesOf('Basic', module)
  .add(
    'basic as layer',
    pipe(
      withStats,
      withFetchJson('locations', './data/locations.json'),
      withFetchJson('flows', './data/flows-2016.json'),
    )(({ locations, flows }: any) => {
      const flowMapLayer = new FlowMapLayer({
        id: 'flow-map-layer',
        locations,
        flows,
        getLocationId: (loc: Location) => loc.properties.abbr,
        getFlowMagnitude: (f: Flow) => f.count,
      });
      return (
        <DeckGL
          style={{ mixBlendMode: 'multiply' }}
          controller={true}
          initialViewState={getViewStateForFeatures(locations, [window.innerWidth, window.innerHeight])}
          layers={[flowMapLayer]}
        >
          <StaticMap mapboxApiAccessToken={mapboxAccessToken} width="100%" height="100%" />
        </DeckGL>
      );
    }),
  )
  .add(
    'basic as interactive component',
    pipe(
      withStats,
      withFetchJson('locations', './data/locations.json'),
      withFetchJson('flows', './data/flows-2016.json'),
    )(({ locations, flows }: any) => (
      <>
        <FlowMap
          pickable={true}
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
            pickable={true}
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
    'two layers',
    pipe(
      withStats,
      withFetchJson('locations', './data/locations.json'),
      withFetchJson('flows', './data/flows-2016.json'),
    )(({ locations, flows }: any) => {
      return (
        <DeckGL
          style={{ mixBlendMode: 'multiply' }}
          controller={true}
          initialViewState={getViewStateForFeatures(locations, [window.innerWidth, window.innerHeight])}
          layers={[
            new FlowMapLayer({
              id: 'flow-map-layer-1',
              colors: {
                flows: {
                  scheme: d3scaleChromatic.schemeReds[d3scaleChromatic.schemeReds.length - 1] as string[],
                },
              },
              showLocationAreas: false,
              locations,
              flows: flows.filter((f: Flow) => f.origin === 'GE'),
              getLocationId,
            }),
            new FlowMapLayer({
              id: 'flow-map-layer-2',
              colors: {
                flows: {
                  scheme: d3scaleChromatic.schemeBlues[d3scaleChromatic.schemeBlues.length - 1] as string[],
                },
              },
              locations,
              showLocationAreas: false,
              flows: flows.filter((f: Flow) => f.origin === 'ZH'),
              getLocationId,
            }),
          ]}
        >
          <StaticMap mapboxApiAccessToken={mapboxAccessToken} width="100%" height="100%" />
        </DeckGL>
      );
    }),
  )
  .add(
    'bearing pitch',
    pipe(
      withStats,
      withFetchJson('locations', './data/locations.json'),
      withFetchJson('flows', './data/flows-2016.json'),
    )(({ locations, flows }: any) => {
      const viewport = getViewStateForFeatures(locations, [window.innerWidth, window.innerHeight]);
      return (
        <>
          <FlowMap
            pickable={true}
            mixBlendMode="multiply"
            getLocationId={getLocationId}
            flows={flows}
            locations={locations}
            showLocationAreas={false}
            initialViewState={{
              ...viewport,
              altitude: 1.5,
              bearing: 40,
              pitch: 50,
              zoom: viewport.zoom * 1.1,
            }}
            mapboxAccessToken={mapboxAccessToken}
          />
          <LegendBox bottom={35} left={10}>
            <LocationTotalsLegend colors={DARK_COLORS} />
          </LegendBox>
        </>
      );
    }),
  )
  .add(
    'dark mode',
    pipe(
      withStats,
      withFetchJson('locations', './data/locations.json'),
      withFetchJson('flows', './data/flows-2016.json'),
    )(({ locations, flows }: any) => {
      return (
        <>
          <FlowMap
            pickable={true}
            colors={DARK_COLORS}
            mapStyle="mapbox://styles/mapbox/dark-v10"
            mixBlendMode="screen"
            getLocationId={getLocationId}
            flows={flows}
            locations={locations}
            showLocationAreas={false}
            initialViewState={getViewStateForFeatures(locations, [window.innerWidth, window.innerHeight])}
            mapboxAccessToken={mapboxAccessToken}
          />
          <LegendBox bottom={35} left={10} style={{ backgroundColor: '#000', color: '#fff' }}>
            <LocationTotalsLegend colors={DARK_COLORS} />
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
            pickable={true}
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
        pickable={true}
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
    'zoom > 12',
    pipe(
      withStats,
      withFetchJson('locations', './data/locations.json'),
      withFetchJson('flows', './data/flows-2016.json'),
    )(({ locations, flows }: any) => (
      <FlowMap
        pickable={true}
        getLocationId={getLocationId}
        showTotals={true}
        showLocationAreas={true}
        flows={flows}
        locations={locations}
        initialViewState={{
          ...getViewStateForFeatures(locations, [window.innerWidth, window.innerHeight]),
          zoom: 13,
          longitude: 8.645888,
          latitude: 47.411184,
        }}
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
        pickable={true}
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
        pickable={true}
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
        pickable={true}
        getLocationId={getLocationId}
        showTotals={false}
        showLocationAreas={true}
        flows={flows}
        locations={locations}
        maxLocationCircleSize={3}
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
      const getTotal = (location: Location) => Math.pow(locationIds.indexOf(getLocationId(location)), 10);
      return (
        <>
          <FlowMap
            pickable={true}
            getLocationId={getLocationId}
            flows={flows}
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
        pickable={true}
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
        pickable={true}
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
    'maxLocationCircleSize',
    pipe(
      withStats,
      withFetchJson('locations', './data/locations.json'),
      withFetchJson('flows', './data/flows-2016.json'),
    )(({ locations, flows }: any) => (
      <FlowMap
        pickable={true}
        getLocationId={getLocationId}
        showTotals={true}
        showLocationAreas={true}
        flows={flows}
        locations={locations}
        initialViewState={getViewStateForFeatures(locations, [window.innerWidth, window.innerHeight])}
        maxLocationCircleSize={30}
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
        pickable={true}
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
    'non-pickable',
    pipe(
      withStats,
      withFetchJson('locations', './data/locations.json'),
      withFetchJson('flows', './data/flows-2016.json'),
    )(({ locations, flows }: any) => (
      <>
        <FlowMap
          pickable={false}
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
    'basic',
    pipe(
      withStats,
      withFetchJson('locations', './data/locations.json'),
      withFetchJson('flows', './data/flows-2016.json'),
    )(({ locations, flows }: any) => (
      <>
        <FlowMap
          pickable={true}
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
    'difference mode',
    pipe(
      withStats,
      withFetchJson('locations', './data/locations.json'),
      withFetchJson('flows', './data/flows-diff-2015-2016.json'),
    )(({ locations, flows }: any) => (
      <>
        <FlowMap
          pickable={true}
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
    'opacity',
    pipe(
      withStats,
      withFetchJson('locations', './data/locations.json'),
      withFetchJson('flows', './data/flows-2016.json'),
    )(({ locations, flows }: any) => {
      const [opacity, setOpacity] = React.useState(0.5);
      return (
        <>
          <FlowMap
            pickable={true}
            getLocationId={getLocationId}
            opacity={opacity}
            flows={flows}
            animate={false}
            locations={locations}
            initialViewState={getViewStateForFeatures(locations, [window.innerWidth, window.innerHeight])}
            mapboxAccessToken={mapboxAccessToken}
          />
          <LegendBox bottom={35} left={10}>
            <LocationTotalsLegend />
          </LegendBox>
          <LegendBox top={10} right={10}>
            <label>Opacity:</label>
            <input
              type="range"
              value={opacity}
              min={0}
              max={1}
              step={0.05}
              onChange={evt => setOpacity(+evt.currentTarget.value)}
            />
          </LegendBox>
        </>
      );
    }),
  )
  .add(
    'maxFlowThickness',
    pipe(
      withStats,
      withFetchJson('locations', './data/locations.json'),
      withFetchJson('flows', './data/flows-2016.json'),
    )(({ locations, flows }: any) => {
      const [thickness, setThickness] = React.useState(15);
      return (
        <>
          <FlowMap
            pickable={true}
            getLocationId={getLocationId}
            maxFlowThickness={thickness}
            flows={flows}
            animate={false}
            locations={locations}
            initialViewState={getViewStateForFeatures(locations, [window.innerWidth, window.innerHeight])}
            mapboxAccessToken={mapboxAccessToken}
          />
          <LegendBox bottom={35} left={10}>
            <LocationTotalsLegend />
          </LegendBox>
          <LegendBox top={10} right={10}>
            <label>Thickness:</label>
            <input
              type="range"
              value={thickness}
              min={0}
              max={30}
              onChange={evt => setThickness(+evt.currentTarget.value)}
            />
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
      const [thickness, setThickness] = React.useState(15);
      const [tailLength, setTailLength] = React.useState(0.7);
      return (
        <>
          <FlowMap
            pickable={true}
            getLocationId={getLocationId}
            maxFlowThickness={thickness}
            flows={flows}
            animate={true}
            tailLength={tailLength}
            locations={locations}
            initialViewState={getViewStateForFeatures(locations, [window.innerWidth, window.innerHeight])}
            mapboxAccessToken={mapboxAccessToken}
          />
          <LegendBox bottom={35} left={10}>
            <LocationTotalsLegend />
          </LegendBox>
          <LegendBox top={10} right={10}>
            <label>Thickness:</label>
            <input
              type="range"
              value={thickness}
              min={0}
              max={30}
              onChange={evt => setThickness(+evt.currentTarget.value)}
            />
            <label>Tail length:</label>
            <input
              type="range"
              value={tailLength}
              min={0.01}
              max={1}
              step={0.1}
              onChange={evt => setTailLength(+evt.currentTarget.value)}
            />
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
            pickable={true}
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
            pickable={true}
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

storiesOf('Cluster on zoom', module)
  .add(
    'basic',
    pipe(
      withStats,
      withFetchJson('locations', './data/locations.json'),
      withFetchJson('flows', './data/flows-2016.json'),
    )(({ locations, flows }: any) => (
      <ClusteringExample
        locations={locations}
        flows={flows}
        getLocationId={(loc: Location) => loc.properties.abbr}
        getLocationCentroid={(loc: Location) => loc.properties.centroid}
        getFlowOriginId={(flow: Flow) => flow.origin}
        getFlowDestId={(flow: Flow) => flow.dest}
        getFlowMagnitude={(flow: Flow) => +flow.count}
      />
    )),
  )
  .add(
    'NL commuters',
    pipe(
      withStats,
      withSheetsFetch('1Oe3zM219uSfJ3sjdRT90SAK2kU3xIvzdcCW6cwTsAuc'),
    )(({ locations, flows }: any) => (
      <ClusteringExample
        locations={locations}
        flows={flows}
        getLocationId={(loc: Location) => loc.id}
        getLocationCentroid={(loc: Location): [number, number] => [+loc.lon, +loc.lat]}
        getFlowOriginId={(flow: Flow) => flow.origin}
        getFlowDestId={(flow: Flow) => flow.dest}
        getFlowMagnitude={(flow: Flow) => +flow.count}
      />
    )),
  );

storiesOf('Other datasets', module)
  .add(
    'London bicycle hire',
    pipe(
      withStats,
      withSheetsFetch('1Z6dVVFFrdooHIs8xnJ_O7eM5bhS5KscCi7G_k0jUNDI'),
    )(({ locations, flows }: any) => (
      <Example
        flows={flows}
        locations={locations}
        getLocationId={(loc: Location) => loc.id}
        getLocationCentroid={(location: Location): [number, number] => [+location.lon, +location.lat]}
        getFlowOriginId={(flow: Flow) => flow.origin}
        getFlowDestId={(flow: Flow) => flow.dest}
        getFlowMagnitude={(flow: Flow) => +flow.count}
      />
    )),
  )
  .add(
    'NYC citibike',
    pipe(
      withStats,
      withSheetsFetch('1Aum0anWxPx6bHyfcFXWCCTE8u0xtfenIls_kPAJEDIA'),
    )(({ locations, flows }: any) => (
      <Example
        flows={flows}
        locations={locations}
        getLocationId={(loc: Location) => loc.id}
        getLocationCentroid={(location: Location): [number, number] => [+location.lon, +location.lat]}
        getFlowOriginId={(flow: Flow) => flow.origin}
        getFlowDestId={(flow: Flow) => flow.dest}
        getFlowMagnitude={(flow: Flow) => +flow.count}
      />
    )),
  )
  .add(
    'Chicago taxis',
    pipe(
      withStats,
      withSheetsFetch('1fhX98NFv5gAkkjB2YFCm50-fplFpmWVAZby3dmm9cgQ'),
    )(({ locations, flows }: any) => (
      <Example
        flows={flows}
        locations={locations}
        getLocationId={(loc: Location) => loc.id}
        getLocationCentroid={(location: Location): [number, number] => [+location.lon, +location.lat]}
        getFlowOriginId={(flow: Flow) => flow.origin}
        getFlowDestId={(flow: Flow) => flow.dest}
        getFlowMagnitude={(flow: Flow) => +flow.count}
      />
    )),
  )
  .add(
    'NL commuters',
    pipe(
      withStats,
      withSheetsFetch('1Oe3zM219uSfJ3sjdRT90SAK2kU3xIvzdcCW6cwTsAuc'),
    )(({ locations, flows }: any) => (
      <Example
        flows={flows}
        locations={locations}
        getLocationId={(loc: Location) => loc.id}
        getLocationCentroid={(location: Location): [number, number] => [+location.lon, +location.lat]}
        getFlowOriginId={(flow: Flow) => flow.origin}
        getFlowDestId={(flow: Flow) => flow.dest}
        getFlowMagnitude={(flow: Flow) => +flow.count}
      />
    )),
  );
