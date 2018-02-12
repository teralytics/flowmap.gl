import * as d3Color from 'd3-color';
import * as d3Scale from 'd3-scale';
import { Colors } from './index';
import { DiffColors, RGBA } from './types';

const opacityFloatToIntegerScale = d3Scale
  .scaleLinear()
  .domain([0, 1])
  .range([0, 255]);

export function opacityFloatToInteger(opacity: number): number {
  return Math.round(opacityFloatToIntegerScale(opacity));
}

export function colorAsArray(color: string): RGBA {
  const rgbColor = d3Color.rgb(color);
  return [rgbColor.r, rgbColor.g, rgbColor.b, opacityFloatToInteger(rgbColor.opacity)];
}

export function rgbaToString(color: RGBA): string {
  const [r, g, b, a] = color;
  return `rgba(${r},${g},${b},${a})`;
}

export interface BaseLocationColors {
  normal: string;
  accent: string;
  outlines: string;
}
export interface BaseColors {
  flows: string;
  locations: BaseLocationColors;
}

export interface BaseDiffColors {
  flows: {
    positive: string;
    negative: string;
  };
  locations: BaseLocationColors;
}

function prepareFlowsAndCirclesColors(color: string, dimmedOpacity: number) {
  return {
    flows: {
      min: colorAsArray(
        d3Color
          .hcl(color)
          .brighter(2)
          .toString(),
      ),
      max: colorAsArray(color),
    },
    locationCircles: {
      inner: colorAsArray(color),
      outgoing: colorAsArray(
        d3Color
          .hcl(color)
          .brighter(3)
          .toString(),
      ),
      incoming: colorAsArray(
        d3Color
          .hcl(color)
          .darker(1.25)
          .toString(),
      ),
      dimmed: [0, 0, 0, opacityFloatToInteger(dimmedOpacity)] as RGBA,
      none: [255, 255, 255, 0] as RGBA,
    },
  };
}

function prepareLocationAreasColors(locations: BaseLocationColors) {
  return {
    outline: colorAsArray(locations.outlines),
    normal: colorAsArray(locations.normal),
    connected: colorAsArray(locations.normal),
    selected: colorAsArray(locations.accent),
    highlighted: colorAsArray(
      d3Color
        .hcl(locations.accent)
        .brighter(1)
        .toString(),
    ),
    none: [255, 255, 255, 255] as RGBA,
  };
}

export function isDiffColors(colors: BaseColors | BaseDiffColors): colors is BaseDiffColors {
  return (colors as BaseDiffColors).flows.positive !== undefined;
}

export function prepareColors(colors: BaseColors | BaseDiffColors, dimmedOpacity: number = 0.05): Colors | DiffColors {
  return {
    ...isDiffColors(colors)
      ? {
          positive: prepareFlowsAndCirclesColors(colors.flows.positive, dimmedOpacity),
          negative: prepareFlowsAndCirclesColors(colors.flows.negative, dimmedOpacity),
        }
      : prepareFlowsAndCirclesColors(colors.flows, dimmedOpacity),
    locationAreas: prepareLocationAreasColors(colors.locations),
  };
}
