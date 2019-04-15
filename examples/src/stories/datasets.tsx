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

import { storiesOf } from '@storybook/react';
import * as React from 'react';
import Example from '../components/Example';
import pipe from '../utlis/pipe';
import withSheetsFetch from '../utlis/withSheetsFetch';
import withStats from '../utlis/withStats';

storiesOf('Other datasets', module)
  .add(
    'London bicycle hire',
    pipe(
      withStats,
      withSheetsFetch('1Z6dVVFFrdooHIs8xnJ_O7eM5bhS5KscCi7G_k0jUNDI'),
    )(({ locations, flows }: any) => <Example flows={flows} locations={locations} />),
  )
  .add(
    'NYC citibike',
    pipe(
      withStats,
      withSheetsFetch('1Aum0anWxPx6bHyfcFXWCCTE8u0xtfenIls_kPAJEDIA'),
    )(({ locations, flows }: any) => <Example flows={flows} locations={locations} />),
  )
  .add(
    'Chicago taxis',
    pipe(
      withStats,
      withSheetsFetch('1fhX98NFv5gAkkjB2YFCm50-fplFpmWVAZby3dmm9cgQ'),
    )(({ locations, flows }: any) => <Example flows={flows} locations={locations} />),
  )
  .add(
    'NL commuters',
    pipe(
      withStats,
      withSheetsFetch('1Oe3zM219uSfJ3sjdRT90SAK2kU3xIvzdcCW6cwTsAuc'),
    )(({ locations, flows }: any) => <Example flows={flows} locations={locations} />),
  );
