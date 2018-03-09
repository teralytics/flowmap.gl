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

import { CompositeLayer, GeoJsonLayer, Layer, LayerProps, LayerState, PickingHandler, PickParams } from 'deck.gl';
import { GeometryObject } from 'geojson';
import * as React from 'react';
import FlowCirclesLayer from './FlowCirclesLayer/FlowCirclesLayer';
import FlowLinesLayer from './FlowLinesLayer/FlowLinesLayer';
import * as LocationCirclesLegend from './LocationCirclesLegend';
import createSelectors, { Selectors } from './selectors';
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
    showLocations: true,
    varyFlowColorByMagnitude: false,
  };

  initializeState() {
    const {
      getLocationId,
      getLocationTotalIn,
      getLocationTotalOut,
      getFlowOriginId,
      getFlowDestId,
      getFlowMagnitude,
    } = this.props;
    if (!getLocationId || !getFlowOriginId || !getFlowDestId || !getFlowMagnitude) {
      throw new Error('getters must be defined');
    }

    this.setState({
      selectors: createSelectors({
        getLocationId,
        getLocationTotalIn,
        getLocationTotalOut,
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

        const { getLocationTotalInGetter, getLocationTotalOutGetter } = this.state.selectors;
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
    const { locations, selectedLocationIds, highlightedLocationId, highlightedFlow, getLocationId, fp64 } = this.props;
    if (!getLocationId) {
      throw new Error('getLocationId must be defined');
    }

    const { getLocationAreaLineColorGetter, getLocationAreaFillColorGetter } = this.state.selectors;
    const getLineColor = getLocationAreaLineColorGetter(this.props);
    const getFillColor = getLocationAreaFillColorGetter(this.props);

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

  getFlowLinesLayer(id: string, flows: Flow[], dimmed: boolean): FlowLinesLayer {
    const {
      getFlowOriginId,
      getFlowDestId,
      getFlowMagnitude,
      getLocationCentroid,
      highlightedLocationId,
      highlightedFlow,
      showTotals,
      fp64,
    } = this.props;
    if (!getFlowOriginId || !getFlowDestId || !getFlowMagnitude || !getLocationCentroid) {
      throw new Error('getters must be defined');
    }

    const {
      getLocationsById,
      getMakeFlowLinesColorGetter,
      getFlowThicknessScale,
      getLocationCircleRadiusGetter,
    } = this.state.selectors;

    const getLocationRadius = getLocationCircleRadiusGetter(this.props);
    const locationsById = getLocationsById(this.props);
    const flowThicknessScale = getFlowThicknessScale(this.props);
    const getSourcePosition: FlowAccessor<[number, number]> = flow =>
      getLocationCentroid(locationsById[getFlowOriginId(flow)]);
    const getTargetPosition: FlowAccessor<[number, number]> = flow =>
      getLocationCentroid(locationsById[getFlowDestId(flow)]);
    const getThickness: FlowAccessor<number> = flow => flowThicknessScale(getFlowMagnitude(flow));
    const getEndpointOffsets: FlowAccessor<[number, number]> = flow => {
      if (!showTotals) {
        return [0, 0];
      }

      return [
        getLocationRadius({
          location: locationsById[getFlowOriginId(flow)],
          type: LocationCircleType.INNER,
        }),
        getLocationRadius({
          location: locationsById[getFlowDestId(flow)],
          type: LocationCircleType.OUTER,
        }),
      ];
    };
    const getFlowLinesColorGetter = getMakeFlowLinesColorGetter(this.props);
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

  getNodesLayer(id: string): FlowCirclesLayer {
    const {
      highlightedLocationId,
      highlightedFlow,
      selectedLocationIds,
      getLocationId,
      getLocationCentroid,
      getFlowOriginId,
      getFlowDestId,
      fp64,
      flows,
    } = this.props;
    if (!getLocationId || !getFlowOriginId || !getFlowDestId || !getLocationCentroid) {
      throw new Error('getters must be defined');
    }

    const { getLocationCircleColorGetter, getLocationCircles, getLocationCircleRadiusGetter } = this.state.selectors;

    const getRadius = getLocationCircleRadiusGetter(this.props);
    const circles = getLocationCircles(this.props);
    const getColor = getLocationCircleColorGetter(this.props);
    const getPosition: LocationCircleAccessor<[number, number]> = locCircle => getLocationCentroid(locCircle.location);

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

  renderLayers() {
    const { showTotals, showLocations } = this.props;
    const { getActiveFlows, getSortedNonSelfFlows } = this.state.selectors;

    const flows = getSortedNonSelfFlows(this.props);
    const activeFlows = getActiveFlows(this.props);

    const layers: Layer[] = [];

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

  renderLocationCirclesLegend(width: number, height: number) {
    const { colors } = this.props;
    return React.createElement(LocationCirclesLegend.default, { width, height, colors });
  }
}
