/*
 * Copyright 2020 Teralytics
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

import pipe from '../utils/pipe';
import withStats from '../utils/withStats';
import { withFetchJson } from '../utils/withFetch';
import { DeckGL } from '@deck.gl/react';
import { StaticMap } from 'react-map-gl';
import { mapboxAccessToken } from '../index';
import React, { useMemo } from 'react';
import { storiesOf } from '@storybook/react';
import { Flow, FlowLinesLayer, Location } from '@flowmap.gl/core';
import { getViewStateForFeatures } from '@flowmap.gl/react';
import { scaleLinear } from 'd3-scale';
import { ascending, max } from 'd3-array';

storiesOf('Typed arrays', module).add(
  'Typed array attributes',
  pipe(
    withStats,
    withFetchJson('locations', './data/locations.json'),
    withFetchJson('flows', './data/flows-2016.json'),
  )(({ locations, flows }: any) => {
    const centroidsById = locations.features.reduce((m: any, d: Location) => {
      m[d.properties.abbr] = d.properties.centroid;
      return m;
    }, {});

    const sortedFlows = useMemo(() => flows.slice().sort((a: Flow, b: Flow) => ascending(+a.count, +b.count)), [flows]);

    const thicknessScale = scaleLinear()
      .range([0, 10])
      .domain([0, max(sortedFlows, (f: Flow) => +f.count) || 0]);

    const sourcePositions = useMemo(() => new Float32Array(sortedFlows.flatMap((d: Flow) => centroidsById[d.origin])), [
      sortedFlows,
    ]);
    const targetPositions = useMemo(() => new Float32Array(sortedFlows.flatMap((d: Flow) => centroidsById[d.dest])), [
      sortedFlows,
    ]);
    const thicknesses = useMemo(() => new Float32Array(sortedFlows.map((d: Flow) => thicknessScale(d.count) || 0)), [
      sortedFlows,
    ]);

    const flowLines = new FlowLinesLayer({
      id: 'flowLines',
      data: {
        length: sortedFlows.length,
        attributes: {
          getSourcePosition: { value: sourcePositions, size: 2 },
          getTargetPosition: { value: targetPositions, size: 2 },
          getThickness: { value: thicknesses, size: 1 },
        },
      } as any,
      getEndpointOffsets: [0, 0],
      drawOutline: true,
    } as any);

    return (
      <DeckGL
        style={{ mixBlendMode: 'multiply' }}
        controller={true}
        initialViewState={getViewStateForFeatures(locations, [window.innerWidth, window.innerHeight])}
        layers={[flowLines]}
      >
        <StaticMap mapboxApiAccessToken={mapboxAccessToken} width="100%" height="100%" />
      </DeckGL>
    );
  }),
);
