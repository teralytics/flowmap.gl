import { createSelector } from 'reselect'
import _ from 'lodash'
import * as d3scale from 'd3-scale'
import * as d3array from 'd3-array'
import * as d3collection from 'd3-collection'
import { interpolateHcl } from 'd3-interpolate'
import * as d3color from 'd3-color'
import { colorAsArray } from './utils'

const getLocations = (props) => props.locations
const getFlowsFromProps = (props) => props.flows
const getLocationIDGetter = (props) => props.getLocationID
const getFlowOriginIDGetter = (props) => props.getFlowOriginID
const getFlowDestIDGetter = (props) => props.getFlowDestID
const getFlowMagnitudeGetter = (props) => props.getFlowMagnitude
const getHighlightedFlow = (props) => props.highlightedFlow
const getHighlightedLocationID = (props) => props.highlightedLocationID
const getSelectedLocationID = (props) => props.selectedLocationID

const getBaseColor = (props) => props.baseColor


export default () => {

  const getColors = createSelector(getBaseColor, baseColor => {
    const NOCOLOR = [0, 0, 0, 0]
    const DIMMED = [0, 0, 0, 100]

    const baseColorDarker = d3color.hcl(baseColor).darker(1.5)
    const baseColorBrighter = d3color.hcl(baseColor).brighter(1.5)
    const baseColorBrighter2 = d3color.hcl(baseColor).brighter(2)
    const baseColorBrighter3 = d3color.hcl(baseColor).brighter(3)

    return {
      // FLOW_LINE_COLOR_RANGE: [baseColorBrighter, baseColor],
      FLOW_LINE_COLOR_RANGE: [baseColor, baseColor],

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

  const getLocationsById = createSelector(
    getLocations,
    getLocationIDGetter,
    (locations, getLocationID) =>
      d3collection
        .nest()
        .key(getLocationID)
        .rollup(([l]) => l)
        .object(locations)
  )

  const getFlows = createSelector(
    getFlowsFromProps,
    getSelectedLocationID,
    getFlowOriginIDGetter,
    getFlowDestIDGetter,
    (flows, selectedLocationID, getFlowOriginID, getFlowDestID) => {
      if (selectedLocationID) {
        return flows.filter(flow =>
          getFlowOriginID(flow) === selectedLocationID ||
          getFlowDestID(flow) === selectedLocationID
        )
      }
      return flows
    }
  )

  const isLocationConnectedGetter = createSelector(
    getFlows,
    getHighlightedLocationID,
    getHighlightedFlow,
    getSelectedLocationID,
    getLocationIDGetter,
    getFlowOriginIDGetter,
    getFlowDestIDGetter,
    (flows, highlightedLocationID, highlightedFlow, selectedLocationID,
     getLocationID, getFlowOriginID, getFlowDestID) => {
      if (highlightedFlow) {
        return id =>
          id === getFlowOriginID(highlightedFlow) || id === getFlowDestID(highlightedFlow)
      } else if (highlightedLocationID) {
        const isRelated = (flow) => {
          const originID = getFlowOriginID(flow)
          const destID = getFlowDestID(flow)
          return (
            originID === highlightedLocationID || originID === selectedLocationID ||
            destID === highlightedLocationID || destID === selectedLocationID
          )
        }

        const locations = new Set()
        for (const flow of flows) {
          if (isRelated(flow)) {
            locations.add(getFlowOriginID(flow))
            locations.add(getFlowDestID(flow))
          }
        }
        return id => locations.has(id)
      }

      return () => false
    }
  )

  const getNonSelfFlows = createSelector(
    getFlows,
    getFlowOriginIDGetter,
    getFlowDestIDGetter,
    (flows, getFlowOriginID, getFlowDestID) => flows.filter(
      flow => getFlowOriginID(flow) !== getFlowDestID(flow)
    )
  )

  const getSortedNonSelfFlows = createSelector(
    getNonSelfFlows,
    getFlowMagnitudeGetter,
    (flows, getFlowMagnitude) => _.orderBy(flows, [getFlowMagnitude, 'desc'])
  )

  const getFlowMagnitudeExtent = createSelector(
    getNonSelfFlows,
    getFlowMagnitudeGetter,
    (flows, getFlowMagnitude) => d3array.extent(flows, getFlowMagnitude)
  )

  const getLocationTotals = createSelector(
    getLocations,
    getFlows,
    getFlowOriginIDGetter,
    getFlowDestIDGetter,
    getFlowMagnitudeGetter,
    (locations, flows, getFlowOriginID, getFlowDestID, getFlowMagnitude) => {
      const incoming = {}
      const outgoing = {}
      for (const flow of flows) {
        const originID = getFlowOriginID(flow)
        const destID = getFlowDestID(flow)
        const magnitude = getFlowMagnitude(flow)
        outgoing[originID] = (outgoing[originID] || 0) + magnitude
        incoming[destID] = (incoming[destID] || 0) + magnitude
      }
      return { incoming, outgoing }
    }
  )

  const getLocationTotalInGetter = createSelector(
    getLocationIDGetter,
    getLocationTotals,
    (getLocationID, { incoming }) => location => incoming[getLocationID(location)] || 0
  )

  const getLocationTotalOutGetter = createSelector(
    getLocationIDGetter,
    getLocationTotals,
    (getLocationID, { outgoing }) => location => outgoing[getLocationID(location)] || 0
  )

  const getLocationMaxTotal = createSelector(
    getLocations,
    getLocationTotalInGetter,
    getLocationTotalOutGetter,
    (locations, getLocationTotalIn, getLocationTotalOut) =>
      d3array.max(locations, (l) =>
        Math.max(getLocationTotalIn(l), getLocationTotalOut(l))
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
    getLocationTotalInGetter,
    getLocationTotalOutGetter,
    (sizeScale, getLocationTotalIn, getLocationTotalOut) => (location, kind) => {
      if (!location) return 0
      const getSide = kind === 'inner' ? Math.min : Math.max
      return sizeScale(
        getSide(getLocationTotalIn(location), getLocationTotalOut(location))
      )
    }
  )

  const getLocationCircles = createSelector(
    getLocations,
    getLocationRadiusGetter,
    (locations, getLocationRadius) =>
      _.flatMap(
        locations,
        location => [{ location, kind: 'outer' }, { location, kind: 'inner' }]
      )
  )

  const getActiveFlows = createSelector(
    getSortedNonSelfFlows,
    getHighlightedFlow,
    getHighlightedLocationID,
    getSelectedLocationID,
    getFlowOriginIDGetter,
    getFlowDestIDGetter,
    (flows, highlightedFlow, highlightedLocationID, selectedLocationID,
     getFlowOriginID, getFlowDestID) => {
      if (highlightedFlow) {
        return flows.filter(
          (f) =>
            getFlowOriginID(f) === getFlowOriginID(highlightedFlow) &&
            getFlowDestID(f) === getFlowDestID(highlightedFlow)
        )
      }

      if (highlightedLocationID) {
        return flows.filter(
          (f) =>
            getFlowOriginID(f) === highlightedLocationID ||
            getFlowDestID(f) === highlightedLocationID
        )
      }

      if (selectedLocationID) {
        return flows.filter(
          (f) =>
            getFlowOriginID(f) === selectedLocationID ||
            getFlowDestID(f) === selectedLocationID
        )
      }

      return flows
    }
  )

  return {
    getColors,
    getActiveFlows,
    getSortedNonSelfFlows,
    isLocationConnectedGetter,
    getLocationsById,
    getFlowColorScale,
    getFlowThicknessScale,
    getLocationRadiusGetter,
    getLocationCircles,
    getLocationTotalInGetter,
    getLocationTotalOutGetter,
  }
}
