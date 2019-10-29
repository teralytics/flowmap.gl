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

import { color as d3color, hcl } from 'd3-color';
import { interpolateHcl } from 'd3-interpolate';
import { interpolateRgbBasis } from 'd3-interpolate';
// @ts-ignore
import { scaleSequentialPow } from 'd3-scale';

const DEFAULT_FLOW_MIN_COLOR = 'rgba(240,240,240,0.5)';
const DEFAULT_FLOW_COLOR_SCHEME = [DEFAULT_FLOW_MIN_COLOR, '#137CBD'];
const DEFAULT_FLOW_COLOR_SCHEME_POSITIVE = [DEFAULT_FLOW_MIN_COLOR, '#f6654e'];
const DEFAULT_FLOW_COLOR_SCHEME_NEGATIVE = [DEFAULT_FLOW_MIN_COLOR, '#00a9cc'];
const DEFAULT_OUTLINE_COLOR = '#fff';
const DEFAULT_LOCATION_AREA_COLOR = 'rgba(220,220,220,0.5)';
const DEFAULT_DIMMED_OPACITY = 0.4;
const CIRCLE_DIMMED_OPACITY_MULTIPLIER = 0.5;
const FALLBACK_COLOR_RGBA: RGBA = [255, 255, 255, 255];

export type ColorScale = (value: number) => RGBA;
export type RGBA = [number, number, number, number];

export interface FlowColors {
  scheme?: string[];
  highlighted?: string;
}

export interface LocationCircleColors {
  inner?: string;
  outgoing?: string;
  incoming?: string;
  highlighted?: string;
}

export interface LocationAreaColors {
  outline?: string;
  normal?: string;
  selected?: string;
  highlighted?: string;
  connected?: string;
}

export interface BaseColors {
  darkMode?: boolean;
  locationAreas?: LocationAreaColors;
  dimmedOpacity?: number;
  outlineColor?: string;
}

export interface Colors extends BaseColors {
  flows?: FlowColors;
  locationCircles?: LocationCircleColors;
}

export interface FlowAndCircleColors {
  flows?: FlowColors;
  locationCircles?: LocationCircleColors;
}

export interface DiffColors extends BaseColors {
  positive?: FlowAndCircleColors;
  negative?: FlowAndCircleColors;
}

// The xxxColorsRGBA objects are mirroring the input colors' objects,
// but converted to RGBA and with all the omitted ones set to defaults
// or derived.
export interface FlowColorsRGBA {
  scheme: string[];
  highlighted: RGBA;
}

export interface LocationCircleColorsRGBA {
  inner: RGBA;
  outgoing: RGBA;
  incoming: RGBA;
  highlighted: RGBA;
}

export interface LocationAreaColorsRGBA {
  outline: RGBA;
  normal: RGBA;
  selected: RGBA;
  highlighted: RGBA;
  connected: RGBA;
}

export interface BaseColorsRGBA {
  darkMode: boolean;
  locationAreas: LocationAreaColorsRGBA;
  dimmedOpacity: number;
  outlineColor: RGBA;
}

export interface ColorsRGBA extends BaseColorsRGBA {
  flows: FlowColorsRGBA;
  locationCircles: LocationCircleColorsRGBA;
}

export interface FlowAndCircleColorsRGBA {
  flows: FlowColorsRGBA;
  locationCircles: LocationCircleColorsRGBA;
}

export interface DiffColorsRGBA extends BaseColorsRGBA {
  positive: FlowAndCircleColorsRGBA;
  negative: FlowAndCircleColorsRGBA;
}

export function isDiffColors(colors: DiffColors | Colors): colors is DiffColors {
  return (colors as DiffColors).positive !== undefined;
}

export function isDiffColorsRGBA(colors: DiffColorsRGBA | ColorsRGBA): colors is DiffColorsRGBA {
  return (colors as DiffColorsRGBA).positive !== undefined;
}

function getBaseColorsRGBA(colors: Colors | DiffColors | undefined): BaseColorsRGBA {
  const darkMode = colors && colors.darkMode ? true : false;
  return {
    darkMode,
    locationAreas: getLocationAreaColorsRGBA(colors && colors.locationAreas, darkMode),
    outlineColor: colorAsRgba((colors && colors.outlineColor) || DEFAULT_OUTLINE_COLOR),
    dimmedOpacity: colors && colors.dimmedOpacity != null ? colors.dimmedOpacity : DEFAULT_DIMMED_OPACITY,
  };
}

export function getColorsRGBA(colors: Colors | undefined): ColorsRGBA {
  const baseColorsRGBA = getBaseColorsRGBA(colors);
  return {
    ...baseColorsRGBA,
    ...getFlowAndCircleColors(colors, DEFAULT_FLOW_COLOR_SCHEME, baseColorsRGBA.darkMode),
  };
}

export function getDiffColorsRGBA(colors: DiffColors | undefined): DiffColorsRGBA {
  const baseColorsRGBA = getBaseColorsRGBA(colors);
  return {
    ...baseColorsRGBA,
    positive: getFlowAndCircleColors(
      colors && colors.positive,
      DEFAULT_FLOW_COLOR_SCHEME_POSITIVE,
      baseColorsRGBA.darkMode,
    ),
    negative: getFlowAndCircleColors(
      colors && colors.negative,
      DEFAULT_FLOW_COLOR_SCHEME_NEGATIVE,
      baseColorsRGBA.darkMode,
    ),
  };
}

function getLocationAreaColorsRGBA(colors: LocationAreaColors | undefined, darkMode: boolean): LocationAreaColorsRGBA {
  const normalColor = (colors && colors.normal) || DEFAULT_LOCATION_AREA_COLOR;
  const normalColorHcl = hcl(normalColor);
  const locationAreasNormal = colorAsRgba(normalColor);
  return {
    normal: locationAreasNormal,
    connected: colorAsRgbaOr(colors && colors.connected, locationAreasNormal),
    highlighted: colorAsRgbaOr(
      colors && colors.highlighted,
      normalColorHcl[darkMode ? 'brighter' : 'darker'](1).toString(),
    ),
    selected: colorAsRgbaOr(
      colors && colors.selected,
      colorAsRgba(normalColorHcl[darkMode ? 'brighter' : 'darker'](2).toString()),
    ),
    outline: colorAsRgbaOr(
      colors && colors.outline,
      colorAsRgba(normalColorHcl[darkMode ? 'brighter' : 'darker'](4).toString()),
    ),
  };
}

function getFlowAndCircleColors(
  inputColors: FlowAndCircleColors | undefined,
  defaultFlowColorScheme: string[],
  darkMode: boolean,
): FlowAndCircleColorsRGBA {
  const flowColorScheme = (inputColors && inputColors.flows && inputColors.flows.scheme) || defaultFlowColorScheme;
  const maxFlowColorHcl = hcl(flowColorScheme[flowColorScheme.length - 1]);
  const flowColorHighlighted = colorAsRgbaOr(
    inputColors && inputColors.flows && inputColors.flows.highlighted,
    colorAsRgba(maxFlowColorHcl[darkMode ? 'brighter' : 'darker'](0.7).toString()),
  );

  return {
    flows: {
      scheme: flowColorScheme,
      highlighted: flowColorHighlighted,
    },
    locationCircles: {
      inner: colorAsRgbaOr(
        inputColors && inputColors.locationCircles && inputColors.locationCircles.inner,
        maxFlowColorHcl.toString(),
      ),
      outgoing: colorAsRgbaOr(
        inputColors && inputColors.locationCircles && inputColors.locationCircles.outgoing,
        darkMode ? '#000' : '#fff',
      ),
      incoming: colorAsRgbaOr(
        inputColors && inputColors.locationCircles && inputColors.locationCircles.incoming,
        maxFlowColorHcl[darkMode ? 'brighter' : 'darker'](1.25).toString(),
      ),
      highlighted: colorAsRgbaOr(
        inputColors && inputColors.locationCircles && inputColors.locationCircles.highlighted,
        flowColorHighlighted,
      ),
    },
  };
}

export function colorAsRgba(color: string): RGBA {
  const col = d3color(color);
  if (!col) {
    console.warn('Invalid color: ', color);
    return FALLBACK_COLOR_RGBA;
  }
  const rgbColor = col.rgb();
  return [Math.floor(rgbColor.r), Math.floor(rgbColor.g), Math.floor(rgbColor.b), opacityFloatToInteger(col.opacity)];
}

function colorAsRgbaOr(color: string | undefined, defaultColor: RGBA | string): RGBA {
  if (color) {
    return colorAsRgba(color);
  }
  if (typeof defaultColor === 'string') {
    return colorAsRgba(defaultColor);
  }
  return defaultColor;
}

export function rgbaAsString(color: RGBA): string {
  return `rgba(${color.join(',')})`;
}

export function opacityFloatToInteger(opacity: number): number {
  return Math.round(opacity * 255);
}

export function getDimmedCircleOutlineColor(outlineColor: RGBA, opacity: number): RGBA {
  const [r, g, b, a] = outlineColor;
  return [r, g, b, a * opacity * CIRCLE_DIMMED_OPACITY_MULTIPLIER] as RGBA;
}

export function getDimmedCircleColor(color: RGBA, opacity: number): RGBA {
  return getDimmedColor(color, opacity * CIRCLE_DIMMED_OPACITY_MULTIPLIER);
}

export function getDimmedColor(color: RGBA, opacity?: number): RGBA {
  const col = hcl(rgbaAsString(color));
  if (!col) {
    console.warn('Invalid color: ', color);
    return FALLBACK_COLOR_RGBA;
  }
  col.c *= 0.1; // desaturate color
  const rgbColor = col.rgb();
  return [
    Math.floor(rgbColor.r),
    Math.floor(rgbColor.g),
    Math.floor(rgbColor.b),
    opacityFloatToInteger(opacity !== undefined ? opacity : DEFAULT_DIMMED_OPACITY),
  ];
}

export function createFlowColorScale(
  domain: [number, number],
  scheme: string[],
  animate: boolean | undefined,
): ColorScale {
  const scale = scaleSequentialPow(interpolateRgbBasis(scheme))
    .exponent(animate ? 1 / 2 : 1 / 3)
    .domain(domain);
  return (value: number) => colorAsRgba(scale(value));
}
