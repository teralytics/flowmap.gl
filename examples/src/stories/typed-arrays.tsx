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
import {
  Flow,
  FlowLinesLayer,
  FlowCirclesLayer,
  Location,
  calcLocationTotals,
  getLocationMaxAbsTotalGetter,
} from '@flowmap.gl/core';
import { getViewStateForFeatures } from '@flowmap.gl/react';
import { scaleLinear } from 'd3-scale';
import { ascending, max } from 'd3-array';
import { colorAsRgba } from '@flowmap.gl/core/dist/colors';

function flatMap<S, T>(xs: S[], f: (item: S) => T | T[]): T[] {
  return xs.reduce((acc: T[], x: S) => acc.concat(f(x)), []);
}

function prepareLayersData(locations: Location[], flows: Flow[]) {
  const sortedNonInternalFlows: Flow[] = flows
    .filter((f: Flow) => f.origin !== f.dest)
    .sort((a: Flow, b: Flow) => ascending(+a.count, +b.count));
  const { incoming, outgoing, within } = calcLocationTotals(locations, flows, {
    getFlowOriginId: (flow: Flow) => flow.origin,
    getFlowDestId: (flow: Flow) => flow.dest,
    getFlowMagnitude: (flow: Flow) => +flow.count,
  });
  const centroidsById: Map<string, [number, number]> = locations.reduce(
    (m: Map<string, [number, number]>, d: Location) => (m.set(d.properties.abbr, d.properties.centroid), m),
    new Map(),
  );
  const getLocationMaxAbsTotal = getLocationMaxAbsTotalGetter(
    locations,
    d => incoming[d.properties.abbr],
    d => outgoing[d.properties.abbr],
    d => within[d.properties.abbr],
  );
  const maxAbsTotalsById: Map<string, number> = locations.reduce(
    (m: Map<string, number>, d: Location) => (m.set(d.properties.abbr, getLocationMaxAbsTotal(d)), m),
    new Map(),
  );
  const circleSizeScale = scaleLinear()
    .range([0, 15])
    .domain([0, max(maxAbsTotalsById.values()) || 0]);
  const thicknessScale = scaleLinear()
    .range([0, 0.5])
    .domain([0, max(sortedNonInternalFlows, (f: Flow) => +f.count) || 0]);

  const circlePositions = new Float32Array(flatMap(locations, (d: Location) => d.properties.centroid));
  const circleColors = new Uint8Array(flatMap(locations, (d: Location) => colorAsRgba('#137CBD')));
  const circleRadii = new Float32Array(
    locations.map((d: Location) => circleSizeScale(getLocationMaxAbsTotal(d) || 0) || 0),
  );

  const sourcePositions = new Float32Array(flatMap(sortedNonInternalFlows, (d: Flow) => centroidsById.get(d.origin)!));
  const targetPositions = new Float32Array(flatMap(sortedNonInternalFlows, (d: Flow) => centroidsById.get(d.dest)!));
  const thicknesses = new Float32Array(sortedNonInternalFlows.map((d: Flow) => thicknessScale(d.count) || 0));
  const endpointOffsets = new Float32Array(
    flatMap(sortedNonInternalFlows, (d: Flow) => [
      circleSizeScale(maxAbsTotalsById.get(d.origin) || 0) || 0,
      circleSizeScale(maxAbsTotalsById.get(d.dest) || 0) || 0,
    ]),
  );

  return {
    circleAttributes: {
      length: locations.length,
      attributes: {
        getPosition: { value: circlePositions, size: 2 },
        getColor: { value: circleColors, size: 4 },
        getRadius: { value: circleRadii, size: 1 },
      },
    },
    lineAttributes: {
      length: sortedNonInternalFlows.length,
      attributes: {
        getSourcePosition: { value: sourcePositions, size: 2 },
        getTargetPosition: { value: targetPositions, size: 2 },
        getThickness: { value: thicknesses, size: 1 },
        getEndpointOffsets: { value: endpointOffsets, size: 2 },
      },
    },
  };
}

storiesOf('Typed arrays', module).add(
  'Typed array attributes',
  pipe(
    withStats,
    withFetchJson('locations', './data/locations.json'),
    withFetchJson('flows', './data/flows-2016.json'),
  )(({ locations, flows }: any) => {
    const { lineAttributes, circleAttributes } = useMemo(() => prepareLayersData(locations.features, flows), [
      locations,
      flows,
    ]);
    const flowLinesLayer = new FlowLinesLayer({
      id: 'lines',
      data: lineAttributes,
      drawOutline: true,
    });
    const flowCirclesLayer = new FlowCirclesLayer({
      id: 'circles',
      data: circleAttributes,
      opacity: 1,
    });

    return (
      <DeckGL
        style={{ mixBlendMode: 'multiply' }}
        controller={true}
        initialViewState={getViewStateForFeatures(locations, [window.innerWidth, window.innerHeight])}
        layers={[flowLinesLayer, flowCirclesLayer]}
      >
        <StaticMap mapboxApiAccessToken={mapboxAccessToken} width="100%" height="100%" />
      </DeckGL>
    );
  }),
);
