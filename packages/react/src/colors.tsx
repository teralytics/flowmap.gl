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
import * as d3Color from 'd3-color';

export const colors: Colors = {
  flows: {
    max: '#137CBD',
  },
  locationAreas: {
    outline: 'rgba(92,112,128,0.5)',
    normal: 'rgba(220,220,220,0.5)',
  },
};

const getComplementary = (color: string) => {
  const hcl = d3Color.hcl(color);
  hcl.h = (hcl.h + 180) % 360;
  return hcl.hex();
};

const baseDiffColor = '#17a5be';

export const diffColors: DiffColors = {
  negative: {
    flows: {
      max: baseDiffColor,
    },
  },
  positive: {
    flows: {
      max: getComplementary(baseDiffColor),
    },
  },
  locationAreas: {
    outline: 'rgba(92,112,128,0.5)',
    normal: 'rgba(220,220,220,0.5)',
  },
  borderColor: 'rgb(230,233,237)',
};
