import * as d3Color from 'd3-color';
import * as d3Scale from 'd3-scale';
import { COORDINATE_SYSTEM, LayerProps } from 'deck.gl';

export type RGBA = [number, number, number, number];

export function fp64ify(a: number): [number, number] {
  const hiPart = Math.fround(a);
  const loPart = a - Math.fround(a);
  return [hiPart, loPart];
}

export function enable64bitSupport<T>(props: LayerProps<T>) {
  if (props.fp64) {
    if (props.projectionMode === COORDINATE_SYSTEM.LNGLAT) {
      return true;
    }
  }

  return false;
}

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
