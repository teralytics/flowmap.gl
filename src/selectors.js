import { createSelector } from 'reselect'
import _ from 'lodash'
import * as d3scale from 'd3-scale'
import * as d3array from 'd3-array'
import * as d3collection from 'd3-collection'
import { interpolateHcl } from 'd3-interpolate'
import * as d3color from 'd3-color'
import { colorAsArray } from './utils'

// export type Props = {
//   baseColor: string,
//   flows: ODFlow[],
//   locations: ODLocation[],
//   highlightedLocation: ?string,
//   highlightedFlow: ?OriginDest,
//   selectedLocation: ?string,
//   showTotals: boolean
// }
//
// export type Selectors = {
//   getColors: Function,
//   getActiveFlows: Function,
//   isLocationConnectedGetter: Function,
//   getLocationsByCode: Function,
//   getFlowColorScale: Function,
//   getFlowThicknessScale: Function,
//   getLocationRadiusGetter: Function,
//   getLocationCircles: Function
// }

export default () => {
  const getLocations = (props) => props.locations
  const getFlows = (props) => props.flows
  const getHighlightedFlow = (props) => props.highlightedFlow
  const getHighlightedLocation = (props) => props.highlightedLocation
  const getSelectedLocation = (props) => props.selectedLocation

  const getShowTotals = (props) => props.showTotals
  const getBaseColor = (props) => props.baseColor

  const getColors = createSelector(getBaseColor, baseColor => {
    const NOCOLOR = [0, 0, 0, 0]
    const DIMMED = [0, 0, 0, 100]

    const baseColorDarker = d3color.hcl(baseColor).darker(1.5)
    const baseColorBrighter = d3color.hcl(baseColor).brighter(1.5)
    const baseColorBrighter2 = d3color.hcl(baseColor).brighter(2)
    const baseColorBrighter3 = d3color.hcl(baseColor).brighter(3)

    return {
      FLOW_LINE_COLOR_RANGE: [baseColorBrighter, baseColor],

      CIRCLE_COLORS: {
        inner: colorAsArray(baseColor),
        outgoing: colorAsArray(baseColorBrighter3),
        incoming: colorAsArray(baseColorDarker),

        dimmed: DIMMED,
        none: NOCOLOR
      },

      LOCATION_COLORS: {
        highlighted: colorAsArray(baseColor),
        connected: colorAsArray(baseColorBrighter2),
        none: NOCOLOR
      }
    }
  })

  const getLocationsByCode = createSelector(getLocations, locations =>
    d3collection
      .nest()
      .key((z) => z.properties.code)
      .rollup(([z]) => z)
      .object(locations)
  )

  const isLocationConnectedGetter = createSelector(
    getFlows,
    getHighlightedLocation,
    getHighlightedFlow,
    getSelectedLocation,
    (flows, highlightedLocation, highlightedFlow, selectedLocation) => {
      if (highlightedFlow) {
        return code =>
          code === highlightedFlow.originID || code === highlightedFlow.destID
      } else if (highlightedLocation) {
        const isRelated = ({ origin, dest }) =>
          origin.code === highlightedLocation ||
          dest.code === highlightedLocation ||
          origin.code === selectedLocation ||
          dest.code === selectedLocation

        const locations = _.chain(flows)
          .filter(isRelated)
          .map(f => [f.origin.code, f.dest.code])
          .flatten()
          .value()

        const locationSet = new Set(locations)
        return code => locationSet.has(code)
      }

      return () => false
    }
  )

  const getFlowMagnitudeExtent = createSelector(getFlows, flows =>
    d3array.extent(flows, f => f.magnitude)
  )

  const getLocationMaxTotal = createSelector(getLocations, locations =>
    d3array.max(locations, (z) =>
      Math.max(z.properties.totalIn, z.properties.totalOut)
    )
  )

  const getSizeScale = createSelector(getLocationMaxTotal, maxTotal =>
    d3scale.scalePow().exponent(1 / 2).domain([0, maxTotal]).range([0, 15])
  )

  const getFlowThicknessScale = createSelector(
    getFlowMagnitudeExtent,
    ([minMagnitude, maxMagnitude]) =>
      d3scale.scaleLinear().range([0.05, 0.5]).domain([0, maxMagnitude])
  )

  const getFlowColorScale = createSelector(
    getColors,
    getFlowMagnitudeExtent,
    (colors, [minMagnitude, maxMagnitude]) =>
        d3scale
            .scalePow()
            .exponent(1 / 3)
            .interpolate(interpolateHcl)
            .range(colors.FLOW_LINE_COLOR_RANGE)
            .domain([0, maxMagnitude])
  )

  const getLocationRadiusGetter = createSelector(
    getSizeScale,
    sizeScale => (location, kind) => {
      if (!location) return 0
      const getSide = kind === 'inner' ? Math.min : Math.max
      return sizeScale(
        getSide(location.properties.totalIn, location.properties.totalOut)
      )
    }
  )

  const getLocationCircles = createSelector(
    getLocations,
    getLocationRadiusGetter,
    (locations, getLocationRadius) =>
      _.chain(locations)
        .flatMap(location => [{ location, kind: 'outer' }, { location, kind: 'inner' }])
        .value()
  )

  const getActiveFlows = createSelector(
    getFlows,
    getHighlightedFlow,
    getHighlightedLocation,
    (flows, highlightedFlow, highlightedLocation) => {
      if (highlightedFlow) {
        const { originID, destID } = highlightedFlow
        return flows.filter(
          (f) => f.origin.code === originID && f.dest.code === destID
        )
      }

      if (highlightedLocation) {
        return flows.filter(
          (f) =>
            f.origin.code === highlightedLocation || f.dest.code === highlightedLocation
        )
      }

      return flows
    }
  )

  return {
    getColors,
    getActiveFlows,
    isLocationConnectedGetter,
    getLocationsByCode,
    getFlowColorScale,
    getFlowThicknessScale,
    getLocationRadiusGetter,
    getLocationCircles
  }
}
