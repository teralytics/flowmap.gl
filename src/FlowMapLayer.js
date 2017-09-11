
import { CompositeLayer, PolygonLayer } from 'deck.gl'
import FlowLinesLayer from './FlowLinesLayer/FlowLinesLayer'
import CirclesLayer from './CirclesLayer/circles-layer'
import * as d3color from 'd3-color'
import { colorAsArray } from './utils'
import createSelectors from './selectors'

// type Props = {
//   flows: ODFlow[],
//   locations: ODLocation[],
//   selectedLocation?: ?string,
//   highlightedLocation?: ?string,
//   highlightedFlow?: ?OriginDest,
//   showTotals: ?boolean,
//   showLocationOutlines: ?boolean,
//   onHover?: (info: PickInfo) => void,
//   onClick?: (info: PickInfo) => void
// }

//
// locations,
// getLocationID: l => l.properties.abbr,
// getLocationCentroid: l => l.properties.centroid,
// getLocationGeometryFeature: l => l,
//
// flows,
// getFlowOriginID: f => f.origin,
// getFlowDestID: f => f.dest,
// getFlowMagnitude: f => f.magnitude,


const LAYER_ID__LOCATIONS = 'locations'
const LAYER_ID__LOCATION_AREAS = 'location-areas'
const LAYER_ID__LOCATION_AREAS_OUTLINE1 = 'location-areas-outline1'
const LAYER_ID__LOCATION_AREAS_OUTLINE2 = 'location-areas-outline2'
const LAYER_ID__FLOWS = 'flows'
const LAYER_ID__FLOWS_ACTIVE = 'flows-highlighted'

export default class FlowMapLayer extends CompositeLayer {

  constructor(props) {
    super(props)
  }

  initializeState() {
    this.state = {
      selectors: createSelectors()
    }
  }

  getPickingKind(sourceLayer) {
    const { id } = sourceLayer
    if (id) {
      switch (id) {
        case LAYER_ID__FLOWS:
        case LAYER_ID__FLOWS_ACTIVE:
          return 'flow'
        case LAYER_ID__LOCATIONS:
          return 'location'
        case LAYER_ID__LOCATION_AREAS:
          return 'location-area'
        default:
          return undefined
      }
    }
    return undefined
  }

  getPickingInfo({ info, sourceLayer }) {
    const kind = this.getPickingKind(sourceLayer)
    if (kind) {
      info.kind = kind
      if (kind === 'location' && info.object) {
        info.object = info.object.location
      }
    }
    return info
  }

  renderNodesLayer(id) {
    const { selectors: { getLocationCircles, getLocationRadiusGetter } } = this.state

    const { highlightedLocation, highlightedFlow, selectedLocation } = this.props
    const getLocationRadius = getLocationRadiusGetter(this.props)

    const { selectors: { getColors } } = this.state
    const colors = getColors(this.props)

    const getCircleColor = ({ location, kind }) => {
      const { highlightedLocation } = this.props
      if (
        (!highlightedLocation && !highlightedFlow && !selectedLocation) ||
        highlightedLocation === location.properties.id ||
        selectedLocation === location.properties.id ||
        (highlightedFlow &&
          (location.properties.id === highlightedFlow.originID ||
            location.properties.id === highlightedFlow.destID))
      ) {
        if (kind === 'inner') {
          return colors.CIRCLE_COLORS.inner
        } else {
          if (location.properties.totalIn > location.properties.totalOut) {
            return colors.CIRCLE_COLORS.incoming
          } else {
            return colors.CIRCLE_COLORS.outgoing
          }
        }
      }
      if (kind === 'inner') {
        return colors.CIRCLE_COLORS.none
      }
      return colors.CIRCLE_COLORS.dimmed
    }

    return new CirclesLayer({
      id,
      data: getLocationCircles(this.props),
      getPosition: zc => zc.location.properties.centroid,
      getRadius: ({ location, kind }) => getLocationRadius(location, kind),
      opacity: 1,
      getColor: getCircleColor,
      pickable: true,
      fp64: true,
      updateTriggers: {
        getColor: { highlightedLocation, highlightedFlow, selectedLocation }
      }
    })
  }

  renderNodeAreasLayer(
    id,
    outline  // ?: { color?: number[], width?: number }
  ) {
    const { color: outlineColor = null, width: outlineWidth = null } =
      outline || {}
    const { locations, highlightedLocation, highlightedFlow, selectedLocation } = this.props
    const { selectors: { getColors, isLocationConnectedGetter } } = this.state
    const isConnected = isLocationConnectedGetter(this.props)
    const colors = getColors(this.props)

    const stroked = !!outline
    const pickable = !outline
    const filled = !outline
    const getFillColor = ({ properties: { id } }) =>
      id === highlightedLocation
        ? colors.LOCATION_COLORS.highlighted
        : isConnected(id)
          ? colors.LOCATION_COLORS.connected
          : colors.LOCATION_COLORS.none

    return new PolygonLayer({
      id,
      data: locations,
      getPolygon: ({ geometry: { coordinates } }) => coordinates[0],
      getFillColor,
      opacity: 0.5,
      stroked,
      filled,
      pickable,
      fp64: true,
      updateTriggers: {
        getFillColor: { highlightedLocation, highlightedFlow }
      },
      ...(outlineColor ? { getLineColor: () => outlineColor } : null),
      ...(outlineWidth ? { getLineWidth: () => outlineWidth } : null)
    })
  }

  renderFlowLinesLayer(id, flows, dimmed) {
    const {
      highlightedLocation,
      highlightedFlow,
      showTotals
    } = this.props

    const {
      selectors: {
        getLocationsById,
        getFlowThicknessScale,
        getFlowColorScale,
        getLocationRadiusGetter
      }
    } = this.state

    const getLocationRadius = getLocationRadiusGetter(this.props)
    const locationsById = getLocationsById(this.props)
    const flowThicknessScale = getFlowThicknessScale(this.props)
    const flowColorScale = getFlowColorScale(this.props)

    const getFlowColor = dimmed
      ? (d) => {
          const { l } = d3color.hcl(flowColorScale(d.magnitude))
          return [l, l, l, 100]
        }
      : (d) => colorAsArray(flowColorScale(d.magnitude))

    return new FlowLinesLayer({
      id,
      data: flows,
      getSourcePosition: ({ origin }) => origin.location,
      getTargetPosition: ({ dest }) => dest.location,
      getEndpointOffsets: ({ origin, dest }) =>
        showTotals
          ? [
              getLocationRadius(locationsById[origin.id], 'inner'),
              getLocationRadius(locationsById[dest.id], 'outer')
            ]
          : [0, 0],
      getThickness: d => flowThicknessScale(d.magnitude),
      opacity: 1,
      getColor: getFlowColor,
      pickable: dimmed,
      drawBorder: !dimmed,
      updateTriggers: {
        instanceColors: !dimmed && {
          highlightedLocation,
          highlightedFlow,
        },
        instanceEndpointOffsets: {
          showTotals
        }
      }
    })
  }

  renderLayers() {
    const { showTotals, showLocationOutlines } = this.props
    const { flows } = this.props
    const { selectors: { getActiveFlows } } = this.state

    const layers = []

    const activeFlows = getActiveFlows(this.props)
    layers.push(this.renderNodeAreasLayer(LAYER_ID__LOCATION_AREAS))
    layers.push(this.renderFlowLinesLayer(LAYER_ID__FLOWS, flows, true))
    layers.push(
      this.renderFlowLinesLayer(LAYER_ID__FLOWS_ACTIVE, activeFlows, false)
    )

    if (showTotals) {
      layers.push(this.renderNodesLayer(LAYER_ID__LOCATIONS))
    }

    if (showLocationOutlines) {
      layers.push(
        this.renderNodeAreasLayer(LAYER_ID__LOCATION_AREAS_OUTLINE1, {
          color: [0, 0, 0, 200],
          width: 100
        })
      )
      layers.push(
        this.renderNodeAreasLayer(LAYER_ID__LOCATION_AREAS_OUTLINE2, {
          color: [255, 255, 255, 150],
          width: 60
        })
      )
    }

    return layers
  }
}

FlowMapLayer.layerName = 'FlowMapLayer'
