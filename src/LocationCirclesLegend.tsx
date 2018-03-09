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

import * as React from 'react';
import { getLocationCircleColors } from './colorUtils';
import { Colors, DiffColors } from './types';

export interface Props {
  width: number;
  height: number;
  colors: Colors | DiffColors;
}

const LocationCirclesLegend = ({ width, height, colors }: Props) => {
  const { inner, outgoing, incoming } = getLocationCircleColors(colors, true);
  return (
    <svg width={width} height={height}>
      <circle cx={width / 2} cy={height / 2} r={15} fill={incoming} />
      <circle cx={width / 2} cy={height / 2} r={10} fill={inner} />
    </svg>
  );
};

export default LocationCirclesLegend;
