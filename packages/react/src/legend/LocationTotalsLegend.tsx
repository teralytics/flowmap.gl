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

import { Colors, DiffColors, getColorsRGBA, getDiffColorsRGBA, isDiffColorsRGBA } from '@flowmap.gl/core';
import * as React from 'react';
import Disc from './Disc';

export interface Props {
  diff?: boolean;
  colors?: Colors | DiffColors;
  aboutEqualText?: string;
  moreOutgoingText?: string;
  moreIncomingText?: string;
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

const LocationTotalsLegend = ({ diff, colors, aboutEqualText, moreOutgoingText, moreIncomingText }: Props) => {
  const size = 20;
  const colorsRGBA = diff ? getDiffColorsRGBA(colors) : getColorsRGBA(colors);
  const pos = isDiffColorsRGBA(colorsRGBA) ? colorsRGBA.positive.locationCircles : colorsRGBA.locationCircles;
  const neg = isDiffColorsRGBA(colorsRGBA) ? colorsRGBA.negative.locationCircles : undefined;
  return (
    <div style={styles.outer}>
      <div>
        <div style={styles.item.outer}>
          <Disc size={size} inner={pos.inner} outer={pos.inner} />
          {neg && <Disc size={size} inner={neg.inner} outer={neg.inner} />}
          <div style={styles.item.caption}>{aboutEqualText || 'outgoing ≅ incoming'}</div>
        </div>

        <div style={styles.item.outer}>
          <Disc size={size} inner={pos.inner} outer={pos.outgoing} />
          {neg && <Disc size={size} inner={neg.inner} outer={neg.outgoing} />}
          <div style={styles.item.caption}>{moreOutgoingText || 'more outgoing'}</div>
        </div>

        <div style={styles.item.outer}>
          <Disc size={size} inner={pos.inner} outer={pos.incoming} />
          {neg && <Disc size={size} inner={neg.inner} outer={neg.incoming} />}
          <div style={styles.item.caption}>{moreIncomingText || 'more incoming'}</div>
        </div>
      </div>
    </div>
  );
};

export default LocationTotalsLegend;
