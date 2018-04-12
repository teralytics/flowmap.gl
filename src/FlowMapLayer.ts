/*
 * Copyright 2018 Teralytics
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import {
  CompositeLayer,
  GeoJsonLayer,
  Layer,
  LayerProps,
  LayerState,
  PickingHandler,
  PickParams,
  UpdateStateParams,
} from 'deck.gl';
import { GeometryObject } from 'geojson';
import FlowCirclesLayer from './FlowCirclesLayer/FlowCirclesLayer';
import FlowLinesLayer from './FlowLinesLayer/FlowLinesLayer';
import Selectors from './Selectors';
import {
  Colors,
  Data,
  DiffColors,
  Flow,
  FlowAccessor,
  FlowLayerPickingInfo,
  LocationAccessor,
  LocationCircleAccessor,
  LocationCircleType,
  Locations,
  PickingType,
} from './types';

export interface Props extends LayerProps {
  id: string;
  colors: Colors | DiffColors;
  locations: Locations;
  flows: Flow[];
  fp64?: boolean;
  onClick?: PickingHandler<FlowLayerPickingInfo>;
  onHover?: PickingHandler<FlowLayerPickingInfo>;
  getLocationId?: LocationAccessor<string>;
  getLocationCentroid?: LocationAccessor<[number, number]>;
  getLocationTotalIn?: LocationAccessor<number>;
  getLocationTotalOut?: LocationAccessor<number>;
  getFlowOriginId?: FlowAccessor<string>;
  getFlowDestId?: FlowAccessor<string>;
  getFlowMagnitude?: FlowAccessor<number>;
  showTotals?: boolean;
  locationCircleSize?: number;
  showLocations?: boolean;
  varyFlowColorByMagnitude?: boolean;
  selectedLocationIds?: string[];
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
    locationCircleSize: 3,
    showLocations: true,
    varyFlowColorByMagnitude: false,
    fp64: false,
  };

  initializeState() {
    const { getLocationTotalIn, getLocationTotalOut } = this.props;
    const selectors = new Selectors({
      getLocationId: this.props.getLocationId!,
      getLocationTotalIn,
      getLocationTotalOut,
      getFlowOriginId: this.props.getFlowOriginId!,
      getFlowDestId: this.props.getFlowDestId!,
      getFlowMagnitude: this.props.getFlowMagnitude!,
    });

    this.setState({ selectors });
  }

  updateState(params: UpdateStateParams<Props, {}>) {
    super.updateState(params);

    const { props, changeFlags } = params;
    if (changeFlags.propsChanged) {
      const { getLocationTotalIn, getLocationTotalOut } = props;
      this.state.selectors.setInputGetters({
        getLocationId: props.getLocationId!,
        getLocationTotalIn,
        getLocationTotalOut,
        getFlowOriginId: props.getFlowOriginId!,
        getFlowDestId: props.getFlowDestId!,
        getFlowMagnitude: props.getFlowMagnitude!,
      });
    }
  }

  getPickingInfo(params: PickParams): FlowLayerPickingInfo {
    const type = getPickType(params.sourceLayer);
    if (!type) {
      return params.info;
    }

    const info = {
      ...params.info,
      type,
    };

    if (!info.object || type === PickingType.FLOW) {
      return info;
    }

    const object = type === PickingType.LOCATION ? info.object.location : info.object;
    const { selectors } = this.state;
    const getLocationTotalIn = selectors.getLocationTotalInGetter(this.props);
    const getLocationTotalOut = selectors.getLocationTotalOutGetter(this.props);

    return {
      ...info,
      object: {
        ...object,
        properties: {
          ...object.properties,
          totalIn: getLocationTotalIn(object),
          totalOut: getLocationTotalOut(object),
        },
      },
    };
  }

  renderLayers() {
    const { showLocations } = this.props;
    const { selectors } = this.state;

    const flows = selectors.getSortedNonSelfFlows(this.props);
    const activeFlows = selectors.getActiveFlows(this.props);

    const layers: Layer[] = [];

    if (showLocations) {
      layers.push(this.getLocationAreasLayer(LAYER_ID__LOCATION_AREAS));
    }
    layers.push(this.getFlowLinesLayer(LAYER_ID__FLOWS, flows, true));
    layers.push(this.getFlowLinesLayer(LAYER_ID__FLOWS_ACTIVE, activeFlows, false));
    layers.push(this.getNodesLayer(LAYER_ID__LOCATIONS));

    return layers;
  }

  private getLocationAreasLayer(id: string): GeoJsonLayer<GeometryObject> {
    const { locations, selectedLocationIds, highlightedLocationId, highlightedFlow, fp64 } = this.props;
    const { selectors } = this.state;
    const getLineColor = selectors.getLocationAreaLineColorGetter(this.props);
    const getFillColor = selectors.getLocationAreaFillColorGetter(this.props);

    return new GeoJsonLayer({
      id,
      getFillColor,
      getLineColor,
      lineJointRounded: true,
      data: locations,
      fp64,
      stroked: true,
      filled: true,
      pickable: true,
      opacity: 1,
      lineWidthMinPixels: 1,
      pointRadiusMinPixels: 1,
      updateTriggers: {
        getFillColor: { selectedLocationIds, highlightedLocationId, highlightedFlow },
      },
    });
  }

  private getFlowLinesLayer(id: string, flows: Flow[], dimmed: boolean): FlowLinesLayer {
    const {
      getFlowOriginId,
      getFlowDestId,
      getFlowMagnitude,
      getLocationCentroid,
      highlightedLocationId,
      highlightedFlow,
      showTotals,
      fp64,
      locationCircleSize,
    } = this.props;
    const { selectors } = this.state;

    const endpointOffsets: [number, number] = [(locationCircleSize || 0) + 1, (locationCircleSize || 0) + 1];
    const getLocationRadius = selectors.getLocationCircleRadiusGetter(this.props);
    const locationsById = selectors.getLocationsById(this.props);
    const flowThicknessScale = selectors.getFlowThicknessScale(this.props);
    const getSourcePosition: FlowAccessor<[number, number]> = flow =>
      getLocationCentroid!(locationsById[getFlowOriginId!(flow)]);
    const getTargetPosition: FlowAccessor<[number, number]> = flow =>
      getLocationCentroid!(locationsById[getFlowDestId!(flow)]);
    const getThickness: FlowAccessor<number> = flow => flowThicknessScale(getFlowMagnitude!(flow));
    const getEndpointOffsets: FlowAccessor<[number, number]> = flow => {
      if (!showTotals) {
        return endpointOffsets;
      }

      return [
        getLocationRadius({
          location: locationsById[getFlowOriginId!(flow)],
          type: LocationCircleType.INNER,
        }),
        getLocationRadius({
          location: locationsById[getFlowDestId!(flow)],
          type: LocationCircleType.OUTER,
        }),
      ];
    };
    const getFlowLinesColorGetter = selectors.getMakeFlowLinesColorGetter(this.props);
    const getColor = getFlowLinesColorGetter(dimmed);

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
      fp64,
    });
  }

  private getNodesLayer(id: string): FlowCirclesLayer {
    const {
      highlightedLocationId,
      highlightedFlow,
      selectedLocationIds,
      getLocationCentroid,
      fp64,
      flows,
      showTotals,
    } = this.props;
    const { selectors } = this.state;

    const getRadius = showTotals
      ? selectors.getLocationCircleRadiusGetter(this.props)
      : () => this.props.locationCircleSize!;
    const circles = selectors.getLocationCircles(this.props);
    const getColor = selectors.getLocationCircleColorGetter(this.props);
    const getPosition: LocationCircleAccessor<[number, number]> = locCircle => getLocationCentroid!(locCircle.location);

    return new FlowCirclesLayer({
      id,
      getColor,
      getPosition,
      getRadius,
      data: circles,
      opacity: 1,
      pickable: true,
      fp64,
      updateTriggers: {
        getRadius: { selectedLocationIds, flows },
        getColor: { highlightedLocationId, highlightedFlow, selectedLocationIds, flows },
      },
    });
  }
}
