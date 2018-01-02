import * as d3Color from 'd3-color';
import * as d3Scale from 'd3-scale';

export type RGBA = [number, number, number, number];

const opacityFloatToIntegerScale = d3Scale
  .scaleLinear()
  .domain([0, 1])
  .range([0, 255]);

export function opacityFloatToInteger(opacity: number): number {
  return Math.round(opacityFloatToIntegerScale(opacity));
}

export function colorAsArray(color: d3Color.HCLColor): RGBA {
  const rgbColor = color.rgb();
  return [rgbColor.r, rgbColor.g, rgbColor.b, opacityFloatToInteger(rgbColor.opacity)];
}
