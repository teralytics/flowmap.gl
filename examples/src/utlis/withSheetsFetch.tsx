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

import * as React from 'react';
import { Flow } from '../types';
import pipe from './pipe';
import { withFetchCsv } from './withFetch';

const withSheetsFetch = (sheetKey: string) => (Comp: React.ComponentType<any>) => (props: any) => {
  const Fetcher = pipe(
    withFetchCsv('locations', `https://docs.google.com/spreadsheets/d/${sheetKey}/gviz/tq?tqx=out:csv&sheet=locations`),
    withFetchCsv('flows', `https://docs.google.com/spreadsheets/d/${sheetKey}/gviz/tq?tqx=out:csv&sheet=flows`),
  )(({ locations, flows }: { locations: Location[]; flows: Flow[] }) => {
    return <Comp locations={locations} flows={flows} sheetKey={sheetKey} {...props} />;
  });
  return <Fetcher />;
};

export default withSheetsFetch;
