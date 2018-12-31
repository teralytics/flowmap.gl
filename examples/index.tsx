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
import { FeatureCollection, GeometryObject } from 'geojson';
import * as React from 'react';
import InteractiveExample, { Flow, LocationProperties } from './InteractiveExample';
import StaticExample from './StaticExample';
import { getViewStateForFeature } from './utils';

const mapboxAccessToken = process.env.MapboxAccessToken || '';

// tslint:disable:no-var-requires
const flows16: Flow[] = require('./data/flows-2016.json');
const flowsDiff1516: Flow[] = require('./data/flows-diff-2015-2016.json');
const locationsData: FeatureCollection<GeometryObject, LocationProperties> = require('./data/locations.json');

storiesOf('Static', module)
  .add('simple', () => (
    <StaticExample
      flows={flows16}
      locations={locationsData}
      initialViewState={getViewStateForFeature(locationsData, [window.innerWidth, window.innerHeight])}
      mapboxAccessToken={mapboxAccessToken}
    />
  ))
  .add('custom borders', () => (
    <StaticExample
      flows={flows16}
      locations={locationsData}
      initialViewState={getViewStateForFeature(locationsData, [window.innerWidth, window.innerHeight])}
      mapboxAccessToken={mapboxAccessToken}
      borderThickness={5}
      borderColor="#64e9f9"
    />
  ));

storiesOf('Interactive', module)
  .add('interactive', () => (
    <InteractiveExample
      showTotals={true}
      showLocationAreas={true}
      locations={locationsData}
      flows={flows16}
      initialViewState={getViewStateForFeature(locationsData, [window.innerWidth, window.innerHeight])}
      mapboxAccessToken={mapboxAccessToken}
    />
  ))
  .add('no location areas', () => (
    <InteractiveExample
      showTotals={true}
      showLocationAreas={false}
      locations={locationsData}
      flows={flows16}
      initialViewState={getViewStateForFeature(locationsData, [window.innerWidth, window.innerHeight])}
      mapboxAccessToken={mapboxAccessToken}
    />
  ))
  .add('no totals', () => (
    <InteractiveExample
      showTotals={false}
      showLocationAreas={true}
      locations={locationsData}
      flows={flows16}
      initialViewState={getViewStateForFeature(locationsData, [window.innerWidth, window.innerHeight])}
      mapboxAccessToken={mapboxAccessToken}
    />
  ))
  .add('diff', () => (
    <InteractiveExample
      showTotals={true}
      showLocationAreas={true}
      locations={locationsData}
      flows={flowsDiff1516}
      diff={true}
      initialViewState={getViewStateForFeature(locationsData, [window.innerWidth, window.innerHeight])}
      mapboxAccessToken={mapboxAccessToken}
    />
  ));
