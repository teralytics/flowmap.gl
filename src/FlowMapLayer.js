// @flow

import { CompositeLayer, PolygonLayer } from 'deck.gl'
import FlowLinesLayer from './FlowLinesLayer'
import CirclesLayer from './CirclesLayer'
import * as d3color from 'd3-color'
import { colorAsArray } from '../../../util/color'
import createSelectors from './selectors'
import type {
  ODZone,
  ODFlow,
  ZoneCircle,
  PickInfo,
  PickingKind,
  OriginDest
} from './types'

type Props = {
  flows: ODFlow[],
  zones: ODZone[],
  journeyDurationThreshold: number,
  selectedZone?: ?string,
  highlightedZone?: ?string,
  highlightedFlow?: ?OriginDest,
  showTotals: ?boolean,
  showZoneOutlines: ?boolean,
  onHover?: (info: PickInfo) => void,
  onClick?: (info: PickInfo) => void
}

const LAYER_ID__ZONES = 'zones'
const LAYER_ID__ZONE_AREAS = 'zone-areas'
const LAYER_ID__ZONE_AREAS_OUTLINE1 = 'zone-areas-outline1'
const LAYER_ID__ZONE_AREAS_OUTLINE2 = 'zone-areas-outline2'
const LAYER_ID__FLOWS = 'flows'
const LAYER_ID__FLOWS_ACTIVE = 'flows-highlighted'

export default class FlowMapLayer extends CompositeLayer {
  static layerName = 'FlowMapLayer'

  props: Props

  static defaultProps = {}

  initializeState() {
    this.state = {
      selectors: createSelectors()
    }
  }

  getPickingKind(sourceLayer: { id: string }): ?PickingKind {
    const { id } = sourceLayer
    if (id) {
      switch (id) {
        case LAYER_ID__FLOWS:
        case LAYER_ID__FLOWS_ACTIVE:
          return 'flow'
        case LAYER_ID__ZONES:
          return 'zone'
        case LAYER_ID__ZONE_AREAS:
          return 'zone-area'
        default:
          return undefined
      }
    }
    return undefined
  }

  getPickingInfo(pickParams: { info: PickInfo, sourceLayer: { id: string } }) {
    const { info, sourceLayer } = pickParams
    const kind = this.getPickingKind(sourceLayer)
    if (kind) {
      info.kind = kind
      if (kind === 'zone' && info.object) {
        info.object = info.object.zone
      }
    }
    return info
  }

  renderNodesLayer(id: string) {
    const { selectors: { getZoneCircles, getZoneRadiusGetter } } = this.state

    const { highlightedZone, highlightedFlow, selectedZone } = this.props
    const getZoneRadius = getZoneRadiusGetter(this.props)

    const { selectors: { getColors } } = this.state
    const colors = getColors(this.props)

    const getCircleColor = (zoneCircle: ZoneCircle) => {
      const { zone, kind } = zoneCircle
      const { highlightedZone } = this.props
      if (
        (!highlightedZone && !highlightedFlow && !selectedZone) ||
        highlightedZone === zone.properties.code ||
        selectedZone === zone.properties.code ||
        (highlightedFlow &&
          (zone.properties.code === highlightedFlow.originID ||
            zone.properties.code === highlightedFlow.destID))
      ) {
        if (kind === 'inner') {
          return colors.CIRCLE_COLORS.inner
        } else {
          if (zone.properties.totalIn > zone.properties.totalOut) {
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
      data: getZoneCircles(this.props),
      getPosition: (zc: ZoneCircle) => zc.zone.properties.centroid,
      getRadius: ({ zone, kind }: ZoneCircle) => getZoneRadius(zone, kind),
      opacity: 1,
      getColor: getCircleColor,
      pickable: true,
      fp64: true,
      updateTriggers: {
        getColor: { highlightedZone, highlightedFlow, selectedZone }
      }
    })
  }

  renderNodeAreasLayer(
    id: string,
    outline?: { color?: number[], width?: number }
  ) {
    const { color: outlineColor = null, width: outlineWidth = null } =
      outline || {}
    const { zones, highlightedZone, highlightedFlow, selectedZone } = this.props
    const { selectors: { getColors, isZoneConnectedGetter } } = this.state
    const isConnected = isZoneConnectedGetter(this.props)
    const colors = getColors(this.props)

    const stroked = !!outline
    const pickable = !outline
    const filled = !outline
    const getFillColor = ({ properties: { code } }: ODZone) =>
      code === highlightedZone
        ? colors.ZONE_COLORS.highlighted
        : isConnected(code)
          ? colors.ZONE_COLORS.connected
          : colors.ZONE_COLORS.none

    return new PolygonLayer({
      id,
      data: zones,
      getPolygon: ({ geometry: { coordinates } }: ODZone) => coordinates[0],
      getFillColor,
      opacity: 0.5,
      stroked,
      filled,
      pickable,
      fp64: true,
      updateTriggers: {
        getFillColor: { highlightedZone, highlightedFlow }
      },
      ...(outlineColor ? { getLineColor: () => outlineColor } : null),
      ...(outlineWidth ? { getLineWidth: () => outlineWidth } : null)
    })
  }

  renderFlowLinesLayer(id: string, flows: ODFlow[], dimmed: boolean) {
    const {
      highlightedZone,
      highlightedFlow,
      journeyDurationThreshold,
      showTotals
    } = this.props

    const {
      selectors: {
        getZonesByCode,
        getFlowThicknessScale,
        getFlowColorScale,
        getZoneRadiusGetter
      }
    } = this.state

    const getZoneRadius = getZoneRadiusGetter(this.props)
    const zonesByCode = getZonesByCode(this.props)
    const flowThicknessScale = getFlowThicknessScale(this.props)
    const flowColorScale = getFlowColorScale(this.props)

    const getFlowColor = dimmed
      ? (d: ODFlow) => {
          const { l } = d3color.hcl(flowColorScale(d.magnitude, d.duration, 1))
          return [l, l, l, 100]
        }
      : (d: ODFlow) => colorAsArray(flowColorScale(d.magnitude, d.duration, 1))

    return new FlowLinesLayer({
      id,
      data: flows,
      getSourcePosition: ({ origin }: ODFlow) => origin.location,
      getTargetPosition: ({ dest }: ODFlow) => dest.location,
      getEndpointOffsets: ({ origin, dest }: ODFlow) =>
        showTotals
          ? [
              getZoneRadius(zonesByCode[origin.code], 'inner'),
              getZoneRadius(zonesByCode[dest.code], 'outer')
            ]
          : [0, 0],
      getThickness: d => flowThicknessScale(d.magnitude),
      opacity: 1,
      getColor: getFlowColor,
      pickable: dimmed,
      drawBorder: !dimmed,
      updateTriggers: {
        instanceColors: !dimmed && {
          highlightedZone,
          highlightedFlow,
          journeyDurationThreshold,
        },
        instanceEndpointOffsets: {
          showTotals
        }
      }
    })
  }

  renderLayers() {
    const { showTotals, showZoneOutlines } = this.props
    const { flows } = this.props
    const { selectors: { getActiveFlows } } = this.state

    const layers = []

    const activeFlows = getActiveFlows(this.props)
    layers.push(this.renderNodeAreasLayer(LAYER_ID__ZONE_AREAS))
    layers.push(this.renderFlowLinesLayer(LAYER_ID__FLOWS, flows, true))
    layers.push(
      this.renderFlowLinesLayer(LAYER_ID__FLOWS_ACTIVE, activeFlows, false)
    )

    if (showTotals) {
      layers.push(this.renderNodesLayer(LAYER_ID__ZONES))
    }

    if (showZoneOutlines) {
      layers.push(
        this.renderNodeAreasLayer(LAYER_ID__ZONE_AREAS_OUTLINE1, {
          color: [0, 0, 0, 200],
          width: 100
        })
      )
      layers.push(
        this.renderNodeAreasLayer(LAYER_ID__ZONE_AREAS_OUTLINE2, {
          color: [255, 255, 255, 150],
          width: 60
        })
      )
    }

    return layers
  }
}
