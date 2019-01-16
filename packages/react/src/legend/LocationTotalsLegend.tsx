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

import { getLocationCircleColors } from '@flowmap.gl/core';
import { Colors, DiffColors, isDiffColors } from '@flowmap.gl/core';
import * as React from 'react';
import Disc from './Disc';

export interface Props {
  colors: Colors | DiffColors;
}

const styles = {
  outer: {
    display: 'flex',
    flexDirection: 'column' as 'column',
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

const LocationTotalsLegend = ({ colors }: Props) => {
  const size = 20;
  const pos = getLocationCircleColors(colors, true);
  const neg = isDiffColors(colors) ? getLocationCircleColors(colors, false) : undefined;
  return (
    <div style={styles.outer}>
      <div>
        <div style={styles.item.outer}>
          <Disc size={size} inner={pos.inner} outer={pos.inner} />
          {neg && <Disc size={size} inner={neg.inner} outer={neg.inner} />}
          <div style={styles.item.caption}>outgoing ≅ incoming</div>
        </div>

        <div style={styles.item.outer}>
          <Disc size={size} inner={pos.inner} outer={pos.outgoing} />
          {neg && <Disc size={size} inner={neg.inner} outer={neg.outgoing} />}
          <div style={styles.item.caption}>more outgoing</div>
        </div>

        <div style={styles.item.outer}>
          <Disc size={size} inner={pos.inner} outer={pos.incoming} />
          {neg && <Disc size={size} inner={neg.inner} outer={neg.incoming} />}
          <div style={styles.item.caption}>more incoming</div>
        </div>
      </div>
    </div>
  );
};

export default LocationTotalsLegend;
