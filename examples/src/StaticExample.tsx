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

import { DeckGL } from '@deck.gl/react';
import FlowMapLayer, { Location } from '@flowmap.gl/core';
import { FeatureCollection, GeometryObject } from 'geojson';
import * as React from 'react';
import { StaticMap, ViewState } from 'react-map-gl';
import { colors } from './colors';

export interface Flow {
  origin: string;
  dest: string;
  count: number;
}

export interface LocationProperties {
  abbr: string;
  name: string;
  no: number;
  centroid: [number, number];
}

export interface Props {
  mapboxAccessToken: string;
  initialViewState: ViewState;
  flows: Flow[];
  locations: FeatureCollection<GeometryObject, LocationProperties>;
  borderThickness?: number;
  borderColor?: string;
}

const StaticExample: React.SFC<Props> = ({
  locations,
  flows,
  initialViewState,
  mapboxAccessToken,
  borderThickness,
  borderColor,
}) => {
  const flowMapLayer = new FlowMapLayer({
    id: 'flow-map-layer',
    colors: {
      ...colors,
      ...(borderColor && { borderColor }),
    },
    locations,
    flows,
    getLocationId: (loc: Location) => loc.properties.abbr,
    showLocationAreas: false,
    getFlowMagnitude: (f: Flow) => f.count,
    varyFlowColorByMagnitude: true,
    showTotals: true,
    borderThickness,
  });

  return (
    <DeckGL
      style={{ mixBlendMode: 'multiply' }}
      controller={true}
      initialViewState={initialViewState}
      layers={[flowMapLayer]}
      children={({ width, height, viewState }: any) => (
        <StaticMap mapboxApiAccessToken={mapboxAccessToken} width={width} height={height} viewState={viewState} />
      )}
    />
  );
};

export default StaticExample;