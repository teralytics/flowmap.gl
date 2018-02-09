import * as d3Color from 'd3-color';
import * as d3Scale from 'd3-scale';
import { Colors } from './index';
import { RGBA } from './types';

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

export interface BaseColors {
  flows: string;
  locations: {
    normal: string;
    accent: string;
    outlines: string;
  };
}

export function prepareColors(colors: BaseColors, dimmedOpacity: number = 0.05): Colors {
  const { flows, locations } = colors;

  return {
    flows: {
      min: colorAsArray(
        d3Color
          .hcl(flows)
          .brighter(2)
          .toString(),
      ),
      max: colorAsArray(flows),
    },
    locationAreas: {
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
      none: [255, 255, 255, 255],
    },
    locationCircles: {
      inner: colorAsArray(flows),
      outgoing: colorAsArray(
        d3Color
          .hcl(flows)
          .brighter(3)
          .toString(),
      ),
      incoming: colorAsArray(
        d3Color
          .hcl(flows)
          .darker(1.25)
          .toString(),
      ),
      dimmed: [0, 0, 0, opacityFloatToInteger(dimmedOpacity)],
      none: [255, 255, 255, 0],
    },
  };
}
