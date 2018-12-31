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

import * as d3Color from 'd3-color';
import { interpolateHcl } from 'd3-interpolate';
import * as d3Scale from 'd3-scale';
import { Colors, ColorScale, DiffColors, isDiffColors, RGBA } from './types';

export const BLACK: RGBA = [0, 0, 0, 255];
export const DEFAULT_DIMMED_OPACITY = 1.0;

export function opacityFloatToInteger(opacity: number): number {
  return Math.round(opacity * 255);
}

export function colorAsArray(color: string): RGBA {
  const col = d3Color.color(color);
  if (!col) {
    console.warn('Invalid color: ', color);
    return BLACK;
  }
  const rgbColor = col.rgb();
  return [Math.floor(rgbColor.r), Math.floor(rgbColor.g), Math.floor(rgbColor.b), opacityFloatToInteger(col.opacity)];
}

export function getDimmedColor(color: string, opacity?: number): RGBA {
  const col = d3Color.hcl(color);
  if (!col) {
    console.warn('Invalid color: ', color);
    return BLACK;
  }
  col.c = 0; // desaturate color
  const rgbColor = col.rgb();
  return [
    Math.floor(rgbColor.r),
    Math.floor(rgbColor.g),
    Math.floor(rgbColor.b),
    opacityFloatToInteger(opacity !== undefined ? opacity : DEFAULT_DIMMED_OPACITY),
  ];
}

export function createFlowColorScale(domain: [number, number], range: [string, string]): ColorScale {
  return d3Scale
    .scalePow<string, string>()
    .exponent(1 / 3)
    .interpolate(interpolateHcl)
    .range(range)
    .domain(domain);
}

function getDefaultLocationCircleOutgoingColor(baseColor: string): string {
  return d3Color
    .hcl(baseColor)
    .brighter(3)
    .rgb()
    .toString();
}

function getDefaultLocationCircleIncomingColor(baseColor: string): string {
  return d3Color
    .hcl(baseColor)
    .darker(1.25)
    .rgb()
    .toString();
}

export function getLocationCircleColors(colors: Colors | DiffColors, isPositive: boolean) {
  const typedColors = !isDiffColors(colors) ? colors : isPositive === true ? colors.positive : colors.negative;
  if (!typedColors.locationCircles) {
    const flowsColor = typedColors.flows.max;
    return {
      inner: flowsColor,
      outgoing: getDefaultLocationCircleOutgoingColor(flowsColor),
      incoming: getDefaultLocationCircleIncomingColor(flowsColor),
    };
  }

  const { inner, outgoing, incoming } = typedColors.locationCircles;
  return {
    inner,
    outgoing: outgoing ? outgoing : getDefaultLocationCircleOutgoingColor(inner),
    incoming: incoming ? incoming : getDefaultLocationCircleIncomingColor(inner),
  };
}

export function getDefaultLocationAreaHighlightedColor(selectedColor: string): string {
  return d3Color
    .hcl(selectedColor)
    .brighter(1)
    .rgb()
    .toString();
}

export function getDefaultLocationAreaConnectedColor(normalColor: string): string {
  return d3Color
    .hcl(normalColor)
    .darker(1.25)
    .rgb()
    .toString();
}

export function getDefaultFlowMinColor(maxColor: string): string {
  return d3Color
    .hcl(maxColor)
    .brighter(2)
    .rgb()
    .toString();
}
