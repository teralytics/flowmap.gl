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

import React from 'react';

export interface LegendBoxProps {
  style?: React.CSSProperties;
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
  children: React.ReactNode;
}

const styles = {
  outer: {
    position: 'absolute' as 'absolute',
    background: '#fff',
    padding: 10,
    borderRadius: 4,
    border: '1px solid #ccc',
  },
};

const LegendBox: React.SFC<LegendBoxProps> = ({ style, top, left, right, bottom, children }) => (
  <div
    style={{
      ...styles.outer,
      ...style,
      top,
      left,
      right,
      bottom,
    }}
  >
    {children}
  </div>
);

export default LegendBox;
