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

import { storiesOf } from '@storybook/react';
import * as React from 'react';
import InteractiveExample from './InteractiveExample';
import StaticExample from './StaticExample';
import { getViewStateForFeature } from './utils';
import withFetch, { compose } from './withFetch';

const mapboxAccessToken = process.env.MapboxAccessToken || '';

storiesOf('FlowMapLayer', module)
  .add(
    'non-interactive',
    compose(
      withFetch('locations', '/data/locations.json', response => response.json()),
      withFetch('flows', '/data/flows-2016.json', response => response.json()),
    )(({ locations, flows }: any) => (
      <StaticExample
        flows={flows}
        locations={locations}
        initialViewState={getViewStateForFeature(locations, [window.innerWidth, window.innerHeight])}
        mapboxAccessToken={mapboxAccessToken}
      />
    )),
  )
  .add(
    'interactive',
    compose(
      withFetch('locations', '/data/locations.json', response => response.json()),
      withFetch('flows', '/data/flows-2016.json', response => response.json()),
    )(({ locations, flows }: any) => (
      <InteractiveExample
        showTotals={true}
        showLocationAreas={true}
        flows={flows}
        locations={locations}
        initialViewState={getViewStateForFeature(locations, [window.innerWidth, window.innerHeight])}
        mapboxAccessToken={mapboxAccessToken}
      />
    )),
  )
  .add(
    'no location areas',
    compose(
      withFetch('locations', '/data/locations.json', response => response.json()),
      withFetch('flows', '/data/flows-2016.json', response => response.json()),
    )(({ locations, flows }: any) => (
      <InteractiveExample
        showTotals={true}
        showLocationAreas={false}
        flows={flows}
        locations={locations}
        initialViewState={getViewStateForFeature(locations, [window.innerWidth, window.innerHeight])}
        mapboxAccessToken={mapboxAccessToken}
      />
    )),
  )
  .add(
    'no totals',
    compose(
      withFetch('locations', '/data/locations.json', response => response.json()),
      withFetch('flows', '/data/flows-2016.json', response => response.json()),
    )(({ locations, flows }: any) => (
      <InteractiveExample
        showTotals={false}
        showLocationAreas={true}
        flows={flows}
        locations={locations}
        initialViewState={getViewStateForFeature(locations, [window.innerWidth, window.innerHeight])}
        mapboxAccessToken={mapboxAccessToken}
      />
    )),
  )
  .add(
    'diff',
    compose(
      withFetch('locations', '/data/locations.json', response => response.json()),
      withFetch('flows', '/data/flows-diff-2015-2016.json', response => response.json()),
    )(({ locations, flows }: any) => (
      <InteractiveExample
        showTotals={true}
        showLocationAreas={true}
        flows={flows}
        diff={true}
        locations={locations}
        initialViewState={getViewStateForFeature(locations, [window.innerWidth, window.innerHeight])}
        mapboxAccessToken={mapboxAccessToken}
      />
    )),
  );
