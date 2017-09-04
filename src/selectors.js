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
//   zones: ODZone[],
//   highlightedZone: ?string,
//   highlightedFlow: ?OriginDest,
//   selectedZone: ?string,
//   showTotals: boolean
// }
//
// export type Selectors = {
//   getColors: Function,
//   getActiveFlows: Function,
//   isZoneConnectedGetter: Function,
//   getZonesByCode: Function,
//   getFlowColorScale: Function,
//   getFlowThicknessScale: Function,
//   getZoneRadiusGetter: Function,
//   getZoneCircles: Function
// }

export default () => {
  const getZones = (props) => props.zones
  const getFlows = (props) => props.flows
  const getHighlightedFlow = (props) => props.highlightedFlow
  const getHighlightedZone = (props) => props.highlightedZone
  const getSelectedZone = (props) => props.selectedZone

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

      ZONE_COLORS: {
        highlighted: colorAsArray(baseColor),
        connected: colorAsArray(baseColorBrighter2),
        none: NOCOLOR
      }
    }
  })

  const getZonesByCode = createSelector(getZones, zones =>
    d3collection
      .nest()
      .key((z) => z.properties.code)
      .rollup(([z]) => z)
      .object(zones)
  )

  const isZoneConnectedGetter = createSelector(
    getFlows,
    getHighlightedZone,
    getHighlightedFlow,
    getSelectedZone,
    (flows, highlightedZone, highlightedFlow, selectedZone) => {
      if (highlightedFlow) {
        return code =>
          code === highlightedFlow.originID || code === highlightedFlow.destID
      } else if (highlightedZone) {
        const isRelated = ({ origin, dest }) =>
          origin.code === highlightedZone ||
          dest.code === highlightedZone ||
          origin.code === selectedZone ||
          dest.code === selectedZone

        const zones = _.chain(flows)
          .filter(isRelated)
          .map(f => [f.origin.code, f.dest.code])
          .flatten()
          .value()

        const zoneSet = new Set(zones)
        return code => zoneSet.has(code)
      }

      return () => false
    }
  )

  const getFlowMagnitudeExtent = createSelector(getFlows, flows =>
    d3array.extent(flows, f => f.magnitude)
  )

  const getZoneMaxTotal = createSelector(getZones, zones =>
    d3array.max(zones, (z) =>
      Math.max(z.properties.totalIn, z.properties.totalOut)
    )
  )

  const getSizeScale = createSelector(getZoneMaxTotal, maxTotal =>
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

  const getZoneRadiusGetter = createSelector(
    getSizeScale,
    sizeScale => (zone, kind) => {
      if (!zone) return 0
      const getSide = kind === 'inner' ? Math.min : Math.max
      return sizeScale(
        getSide(zone.properties.totalIn, zone.properties.totalOut)
      )
    }
  )

  const getZoneCircles = createSelector(
    getZones,
    getZoneRadiusGetter,
    (zones, getZoneRadius) =>
      _.chain(zones)
        .flatMap(zone => [{ zone, kind: 'outer' }, { zone, kind: 'inner' }])
        .value()
  )

  const getActiveFlows = createSelector(
    getFlows,
    getHighlightedFlow,
    getHighlightedZone,
    (flows, highlightedFlow, highlightedZone) => {
      if (highlightedFlow) {
        const { originID, destID } = highlightedFlow
        return flows.filter(
          (f) => f.origin.code === originID && f.dest.code === destID
        )
      }

      if (highlightedZone) {
        return flows.filter(
          (f) =>
            f.origin.code === highlightedZone || f.dest.code === highlightedZone
        )
      }

      return flows
    }
  )

  return {
    getColors,
    getActiveFlows,
    isZoneConnectedGetter,
    getZonesByCode,
    getFlowColorScale,
    getFlowThicknessScale,
    getZoneRadiusGetter,
    getZoneCircles
  }
}
