import { CompositeLayer, GeoJsonLayer, Layer, LayerProps, LayerState, PickingHandler, PickParams } from 'deck.gl';
import { GeometryObject } from 'geojson';
import FlowCirclesLayer from './FlowCirclesLayer/FlowCirclesLayer';
import FlowLinesLayer from './FlowLinesLayer/FlowLinesLayer';
import createSelectors, { Selectors } from './selectors';
import {
  Data,
  Flow,
  FlowAccessor,
  FlowLayerPickingInfo,
  Location,
  LocationAccessor,
  LocationCircleAccessor,
  LocationCircleType,
  Locations,
  PickingType,
} from './types';
import { colorAsArray, RGBA } from './utils';

export interface Props extends LayerProps {
  baseColor: string;
  locations: Locations;
  flows: Flow[];
  onClick?: PickingHandler<FlowLayerPickingInfo>;
  onHover?: PickingHandler<FlowLayerPickingInfo>;
  getLocationId?: LocationAccessor<string>;
  getLocationCentroid?: LocationAccessor<[number, number]>;
  getFlowOriginId?: FlowAccessor<string>;
  getFlowDestId?: FlowAccessor<string>;
  getFlowMagnitude?: FlowAccessor<number>;
  showTotals?: boolean;
  showLocations?: boolean;
  varyFlowColorByMagnitude?: boolean;
  selectedLocationId?: string;
  highlightedLocationId?: string;
  highlightedFlow?: Flow;
}

export interface State extends LayerState {
  selectors: Selectors;
}

const LAYER_ID__LOCATIONS = 'locations';
const LAYER_ID__LOCATION_AREAS = 'location-areas';
const LAYER_ID__FLOWS = 'flows';
const LAYER_ID__FLOWS_ACTIVE = 'flows-highlighted';

function getPickType({ id }: Layer<Data>): PickingType | undefined {
  switch (id) {
    case LAYER_ID__FLOWS:
    // fall through
    case LAYER_ID__FLOWS_ACTIVE:
      return PickingType.FLOW;
    case LAYER_ID__LOCATIONS:
      return PickingType.LOCATION;
    case LAYER_ID__LOCATION_AREAS:
      return PickingType.LOCATION_AREA;
    default:
      return undefined;
  }
}

export default class FlowMapLayer extends CompositeLayer<Props, State> {
  static layerName: string = 'FlowMapLayer';
  static defaultProps: Partial<Props> = {
    getLocationId: l => l.id || l.properties.id,
    getLocationCentroid: l => l.properties.centroid,
    getFlowOriginId: f => f.origin,
    getFlowDestId: f => f.dest,
    getFlowMagnitude: f => f.magnitude,
    showTotals: true,
    showLocations: true,
    varyFlowColorByMagnitude: false,
  };

  constructor(props: Props) {
    super(props);
  }

  initializeState() {
    const { getLocationId, getFlowOriginId, getFlowDestId, getFlowMagnitude } = this.props;
    if (!getLocationId || !getFlowOriginId || !getFlowDestId || !getFlowMagnitude) {
      throw new Error('getters must be defined');
    }

    this.setState({
      selectors: createSelectors({
        getLocationId,
        getFlowOriginId,
        getFlowDestId,
        getFlowMagnitude,
      }),
    });
  }

  getPickingInfo(params: PickParams): FlowLayerPickingInfo {
    const info = params.info;
    const type = getPickType(params.sourceLayer);
    if (type) {
      info.type = type;
      if (info.object && (type === PickingType.LOCATION || type === PickingType.LOCATION_AREA)) {
        if (type === PickingType.LOCATION) {
          info.object = info.object.location;
        }

        const { selectors: { getLocationTotalInGetter, getLocationTotalOutGetter } } = this.state;
        const getLocationTotalIn = getLocationTotalInGetter(this.props);
        const getLocationTotalOut = getLocationTotalOutGetter(this.props);
        info.object.properties = {
          ...info.object.properties,
          totalIn: getLocationTotalIn(info.object),
          totalOut: getLocationTotalOut(info.object),
        };
      }
    }

    return info;
  }

  getLocationAreasLayer(id: string): GeoJsonLayer<GeometryObject> {
    const { locations, selectedLocationId, highlightedLocationId, highlightedFlow, getLocationId } = this.props;
    if (!getLocationId) {
      throw new Error('getLocationId must be defined');
    }

    const { selectors: { getColors, isLocationConnectedGetter } } = this.state;
    const isConnected = isLocationConnectedGetter(this.props);
    const colors = getColors(this.props);

    const getFillColor = (location: Location) => {
      const locationId = getLocationId(location);
      const { normal, highlighted, selected, connected } = colors.locationAreaColors;
      if (locationId === selectedLocationId) {
        return selected;
      }

      if (locationId === highlightedLocationId) {
        return highlighted;
      }

      if (isConnected(locationId)) {
        return connected;
      }

      return normal;
    };

    return new GeoJsonLayer({
      id,
      getFillColor,
      data: locations,
      fp64: true,
      stroked: true,
      filled: true,
      pickable: true,
      opacity: 0.5,
      lineWidthMinPixels: 2,
      pointRadiusMinPixels: 2,
      updateTriggers: {
        getFillColor: { selectedLocationId, highlightedLocationId, highlightedFlow },
      },
    });
  }

  getFlowLinesLayer(id: string, flows: Flow[], dimmed: boolean): FlowLinesLayer {
    const {
      getFlowOriginId,
      getFlowDestId,
      getFlowMagnitude,
      getLocationCentroid,
      highlightedLocationId,
      highlightedFlow,
      showTotals,
    } = this.props;
    if (!getFlowOriginId || !getFlowDestId || !getFlowMagnitude || !getLocationCentroid) {
      throw new Error('getters must be defined');
    }

    const {
      selectors: { getLocationsById, getFlowThicknessScale, getFlowColorScale, getLocationRadiusGetter },
    } = this.state;

    const getLocationRadius = getLocationRadiusGetter(this.props);
    const locationsById = getLocationsById(this.props);
    const flowThicknessScale = getFlowThicknessScale(this.props);
    const flowColorScale = getFlowColorScale(this.props);

    const getSourcePosition: FlowAccessor<[number, number]> = flow =>
      getLocationCentroid(locationsById[getFlowOriginId(flow)]);
    const getTargetPosition: FlowAccessor<[number, number]> = flow =>
      getLocationCentroid(locationsById[getFlowDestId(flow)]);
    const getThickness: FlowAccessor<number> = flow => flowThicknessScale(getFlowMagnitude(flow));
    const getEndpointOffsets: FlowAccessor<[number, number]> = flow =>
      showTotals
        ? [
            getLocationRadius({
              location: locationsById[getFlowOriginId(flow)],
              type: LocationCircleType.INNER,
            }),
            getLocationRadius({
              location: locationsById[getFlowDestId(flow)],
              type: LocationCircleType.OUTER,
            }),
          ]
        : [0, 0];
    const getColor: FlowAccessor<RGBA> = dimmed
      ? flow => {
          const { l } = flowColorScale(getFlowMagnitude(flow));
          return [l, l, l, 100] as RGBA;
        }
      : flow => colorAsArray(flowColorScale(getFlowMagnitude(flow)));

    return new FlowLinesLayer({
      id,
      getSourcePosition,
      getTargetPosition,
      getThickness,
      getEndpointOffsets,
      getColor,
      data: flows,
      opacity: 1,
      pickable: dimmed,
      drawBorder: !dimmed,
      updateTriggers: {
        getColor: !dimmed && {
          highlightedLocationId,
          highlightedFlow,
        },
        getEndpointOffsets: {
          showTotals,
        },
      },
    });
  }

  getNodesLayer(id: string): FlowCirclesLayer {
    const {
      highlightedLocationId,
      highlightedFlow,
      selectedLocationId,
      getLocationId,
      getLocationCentroid,
      getFlowOriginId,
      getFlowDestId,
    } = this.props;
    if (!getLocationId || !getFlowOriginId || !getFlowDestId || !getLocationCentroid) {
      throw new Error('getters must be defined');
    }

    const {
      selectors: { getLocationCircles, getLocationRadiusGetter, getLocationTotalInGetter, getLocationTotalOutGetter },
    } = this.state;

    const getLocationTotalIn = getLocationTotalInGetter(this.props);
    const getLocationTotalOut = getLocationTotalOutGetter(this.props);
    const getLocationRadius = getLocationRadiusGetter(this.props);

    const { selectors: { getColors } } = this.state;
    const colors = getColors(this.props);
    const circles = getLocationCircles(this.props);

    const getPosition: LocationCircleAccessor<[number, number]> = locCircle => getLocationCentroid(locCircle.location);
    const getColor: LocationCircleAccessor<RGBA> = ({ location, type }) => {
      const { inner, incoming, outgoing, none, dimmed } = colors.locationCircleColors;

      if (
        (!this.props.highlightedLocationId && !highlightedFlow && !selectedLocationId) ||
        this.props.highlightedLocationId === getLocationId(location) ||
        selectedLocationId === getLocationId(location) ||
        (highlightedFlow &&
          (getLocationId(location) === getFlowOriginId(highlightedFlow) ||
            getLocationId(location) === getFlowDestId(highlightedFlow)))
      ) {
        if (type === LocationCircleType.INNER) {
          return inner;
        }

        if (getLocationTotalIn(location) > getLocationTotalOut(location)) {
          return incoming;
        }

        return outgoing;
      }

      if (type === LocationCircleType.INNER) {
        return none;
      }

      return dimmed;
    };

    return new FlowCirclesLayer({
      id,
      getPosition,
      getColor,
      getRadius: getLocationRadius,
      data: circles,
      opacity: 1,
      pickable: true,
      fp64: true,
      updateTriggers: {
        getRadius: { selectedLocationId },
        getColor: { highlightedLocationId, highlightedFlow, selectedLocationId },
      },
    });
  }

  renderLayers() {
    const { showTotals, showLocations } = this.props;
    const { selectors: { getActiveFlows, getSortedNonSelfFlows } } = this.state;

    const flows = getSortedNonSelfFlows(this.props);
    const activeFlows = getActiveFlows(this.props);

    const layers = [];

    if (showLocations) {
      layers.push(this.getLocationAreasLayer(LAYER_ID__LOCATION_AREAS));
    }
    layers.push(this.getFlowLinesLayer(LAYER_ID__FLOWS, flows, true));
    layers.push(this.getFlowLinesLayer(LAYER_ID__FLOWS_ACTIVE, activeFlows, false));
    if (showTotals) {
      layers.push(this.getNodesLayer(LAYER_ID__LOCATIONS));
    }

    return layers;
  }
}
