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

import { RGBA, rgbaAsString } from '@flowmap.gl/core';
import * as React from 'react';

export interface DiscProps {
  size: number;
  inner: RGBA;
  outer: RGBA;
}

const Disc: React.SFC<DiscProps> = ({ size, inner, outer }) => {
  return (
    <svg width={size} height={size} style={{ marginRight: 5 }}>
      <circle cx={size / 2} cy={size / 2} r={size * 0.5} fill={rgbaAsString(outer)} />
      <circle cx={size / 2} cy={size / 2} r={size * 0.5 * 0.75} fill={rgbaAsString(inner)} />
    </svg>
  );
};

export default Disc;
