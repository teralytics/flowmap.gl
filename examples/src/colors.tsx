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

import { Colors, DiffColors } from '@flowmap.gl/core';

export enum ColorScheme {
  primary = '#137CBD',
}

export const colors: Colors = {
  flows: {
    max: ColorScheme.primary,
  },
  locationAreas: {
    outline: 'rgba(92,112,128,0.5)',
    normal: 'rgba(187,187,187,0.35)',
  },
  borderColor: 'rgba(250,250,250,0.5)',
};

const complementary = '#f52020';
const baseDiffColor = '#17a5be';

export const diffColors: DiffColors = {
  negative: {
    flows: {
      max: baseDiffColor,
    },
  },
  positive: {
    flows: {
      max: complementary,
    },
  },
  locationAreas: {
    outline: 'rgba(92,112,128,0.5)',
    normal: 'rgba(220,220,220,0.35)',
  },
  borderColor: 'rgb(250,250,255)',
};
