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

import DeckGL from 'deck.gl';
import { FeatureCollection, GeometryObject } from 'geojson';
import * as React from 'react';
import { StaticMap, Viewport } from 'react-map-gl';
import FlowMapLayer, { Colors, Location } from '../src';

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

const colors: Colors = {
  flows: {
    max: '#137CBD',
  },
  locationAreas: {
    outline: 'rgba(92,112,128,0.5)',
    normal: 'rgba(187,187,187,0.5)',
    selected: 'rgba(217,130,43,0.5)',
  },
};

export interface Props {
  mapboxAccessToken: string;
  viewport: Viewport;
  flows: Flow[];
  locations: FeatureCollection<GeometryObject, LocationProperties>;
  borderThickness?: number;
  borderColor?: string;
}

const StaticExample: React.SFC<Props> = ({ locations, flows, viewport, mapboxAccessToken, borderThickness, borderColor }) => {
  const flowMapLayer = new FlowMapLayer({
    id: 'flow-map-layer',
    colors,
    locations,
    flows,
    getLocationId: (loc: Location) => loc.properties.abbr,
    showLocationAreas: true,
    getFlowMagnitude: f => f.count,
    varyFlowColorByMagnitude: true,
    showTotals: true,
    borderThickness: borderThickness,
    borderColor: borderColor,
  });

  return (
    <DeckGL
      style={{ mixBlendMode: 'multiply' }}
      controller={true}
      initialViewState={viewport}
      layers={[flowMapLayer]}
      children={({ width, height, viewState }) => (
        <StaticMap mapboxApiAccessToken={mapboxAccessToken} width={width} height={height} viewState={viewState} />
      )}
    />
  );
};

export default StaticExample;
