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
import FlowMap, { Flow, LocationProperties } from './FlowMap';

// tslint:disable:no-var-requires
const flows16: Flow[] = require('./data/flows-2015.json');
const flowsDiff1516: Flow[] = require('./data/flows-diff-2015-2016.json');
const locationsData: FeatureCollection<GeometryObject, LocationProperties> = require('./data/locations.json');

storiesOf('Swiss cantons migration', module)
  .add('simple', () => <FlowMap fp64={false} showTotals={true} locations={locationsData} flows={flows16} />)
  .add('no totals', () => <FlowMap fp64={false} showTotals={false} locations={locationsData} flows={flows16} />)
  .add('diff', () => (
    <FlowMap fp64={false} showTotals={true} locations={locationsData} flows={flowsDiff1516} diff={true} />
  ));
