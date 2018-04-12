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

const mapboxAccessToken = process.env.STORYBOOK_MapboxAccessToken || '';

// tslint:disable:no-var-requires
const flows16: Flow[] = require('./data/flows-2016.json');
const flowsDiff1516: Flow[] = require('./data/flows-diff-2015-2016.json');
const locationsData: FeatureCollection<GeometryObject, LocationProperties> = require('./data/locations.json');

storiesOf('Swiss cantons migration', module)
  .add('static', () => (
    <StaticExample
      flows={flows16}
      locations={locationsData}
      mapboxAccessToken={mapboxAccessToken}
      width={window.innerWidth}
      height={window.innerHeight}
      viewport={{
        longitude: 8.223980665200001,
        latitude: 46.813186645550005,
        zoom: 7,
      }}
    />
  ))
  .add('interactive', () => (
    <InteractiveExample fp64={false} showTotals={true} locations={locationsData} flows={flows16} />
  ))
  .add('no totals', () => (
    <InteractiveExample fp64={false} showTotals={false} locations={locationsData} flows={flows16} />
  ))
  .add('diff', () => (
    <InteractiveExample fp64={false} showTotals={true} locations={locationsData} flows={flowsDiff1516} diff={true} />
  ));
