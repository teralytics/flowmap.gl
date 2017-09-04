import * as d3color from 'd3-color'
import * as d3scale from 'd3-scale'

const opacityDecimalToInteger = o =>
  Math.round(d3scale.scaleLinear().domain([0, 1]).range([0, 255])(o))

export const colorAsArray = c => {
  const col = d3color.rgb(c.toString())
  return [col.r, col.g, col.b, opacityDecimalToInteger(col.opacity)]
}
