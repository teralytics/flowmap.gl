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
import { getLocationCircleColors } from '../colorUtils';
import { Colors, DiffColors, isDiffColors } from '../types';
import Disc from './Disc';

export interface Props {
  colors: DiffColors;
}

const styles = {
  outer: {
    display: 'flex',
    flexDirection: 'column' as 'column',
  },
  disc: {
    marginRight: 5,
  },
  item: {
    outer: {
      display: 'flex',
      flexDirection: 'row' as 'row',
      padding: '3px 0',
      alignItems: 'center' as 'center',
    },
    caption: {
      marginLeft: 2,
    },
  },
};

const DiffColorsLegend = ({ colors }: Props) => {
  const size = 20;
  const pos = getLocationCircleColors(colors, true);
  const neg = getLocationCircleColors(colors, false);
  return (
    <div style={styles.outer}>
      <div style={styles.item.outer}>
        <Disc size={size} inner={pos.inner} outer={pos.inner} />
        <div style={styles.item.caption}>positive difference</div>
      </div>

      <div style={styles.item.outer}>
        <Disc size={size} inner={neg.inner} outer={neg.inner} />
        <div style={styles.item.caption}>negative difference</div>
      </div>
    </div>
  );
};

export default DiffColorsLegend;
