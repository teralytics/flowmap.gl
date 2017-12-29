import * as d3Color from 'd3-color';
import * as d3Scale from 'd3-scale';

export type RGBA = [number, number, number, number];

function opacityDecimalToInteger(opacity: number) {
  const scale = d3Scale
    .scaleLinear()
    .domain([0, 1])
    .range([0, 255]);

  return Math.round(scale(opacity));
}

export function colorAsArray(color: d3Color.HCLColor): RGBA {
  const rgbColor = color.rgb();
  return [rgbColor.r, rgbColor.g, rgbColor.b, opacityDecimalToInteger(rgbColor.opacity)];
}
