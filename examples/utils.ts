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

import { BoundingBox, viewport } from '@mapbox/geo-viewport';
import { geoBounds } from 'd3-geo';
import { FeatureCollection, GeometryObject } from 'geojson';
import { ViewState } from 'react-map-gl';
import { LocationProperties } from '../src';

export const getViewStateForFeature = (
  featureCollection: FeatureCollection<GeometryObject, LocationProperties>,
  size: [number, number],
  opts?: {
    pad?: number;
    tileSize?: number;
    minZoom?: number;
    maxZoom?: number;
  },
): ViewState => {
  const { pad = 0, tileSize = 512, minZoom = 0, maxZoom = 100 } = opts || {};
  const [[x1, y1], [x2, y2]] = geoBounds(featureCollection);
  const bounds: BoundingBox = [x1 - pad * (x2 - x1), y1 - pad * (y2 - y1), x2 + pad * (x2 - x1), y2 + pad * (y2 - y1)];

  const {
    center: [longitude, latitude],
    zoom,
  } = viewport(bounds, size, undefined, undefined, tileSize);

  return {
    longitude,
    latitude,
    zoom: Math.max(Math.min(maxZoom, zoom), minZoom),
  };
};
