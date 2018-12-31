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

import { CompositeLayer, GeoJsonLayer } from 'deck.gl';
import { colorAsArray } from './colorUtils';
import FlowCirclesLayer from './FlowCirclesLayer/FlowCirclesLayer';
import FlowLinesLayer from './FlowLinesLayer/FlowLinesLayer';
import Selectors from './Selectors';
import {
  Colors,
  DeckGLLayer,
  DiffColors,
  Flow,
  FlowAccessor,
  FlowLayerPickingInfo,
  Location,
  LocationAccessor,
  LocationCircleAccessor,
  LocationCircleType,
  Locations,
  PickingHandler,
  PickingType,
} from './types';

export interface Props {
  id: string;
  colors: Colors | DiffColors;
  locations: Locations;
  flows: Flow[];
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
  showLocationAreas?: boolean;
  varyFlowColorByMagnitude?: boolean;
  selectedLocationIds?: string[];
  highlightedLocationId?: string;
  highlightedFlow?: Flow;
  borderThickness?: number;
}

export interface State {
  selectors: Selectors;
}

const LAYER_ID__LOCATIONS = 'locations';
const LAYER_ID__LOCATION_AREAS = 'location-areas';
const LAYER_ID__FLOWS = 'flows';
const LAYER_ID__FLOWS_ACTIVE = 'flows-highlighted';

function getPickType({ id }: DeckGLLayer): PickingType | undefined {
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

export default class FlowMapLayer extends CompositeLayer {
  static layerName: string = 'FlowMapLayer';
  static defaultProps = {
    getLocationId: { type: 'accessor', value: (l: Location) => l.id || l.properties.id },
    getLocationCentroid: { type: 'accessor', value: (l: Location) => l.properties.centroid },
    getFlowOriginId: { type: 'accessor', value: (f: Flow) => f.origin },
    getFlowDestId: { type: 'accessor', value: (f: Flow) => f.dest },
    getFlowMagnitude: { type: 'accessor', value: (f: Flow) => f.magnitude },
    showTotals: true,
    locationCircleSize: 3,
    showLocationAreas: true,
    varyFlowColorByMagnitude: false,
  };

  constructor(props: Props) {
    super(props);
  }

  initializeState() {
    const {
      getLocationTotalIn,
      getLocationTotalOut,
      getLocationId,
      getFlowOriginId,
      getFlowDestId,
      getFlowMagnitude,
    } = this.props;
    const selectors = new Selectors({
      getLocationId,
      getLocationTotalIn,
      getLocationTotalOut,
      getFlowOriginId,
      getFlowDestId,
      getFlowMagnitude,
    });

    this.setState({ selectors });
  }

  updateState(params: any) {
    super.updateState(params);

    const { props, changeFlags } = params;
    if (changeFlags.propsChanged) {
      const {
        getLocationTotalIn,
        getLocationTotalOut,
        getLocationId,
        getFlowOriginId,
        getFlowDestId,
        getFlowMagnitude,
      } = props;
      this.state.selectors.setInputGetters({
        getLocationId,
        getLocationTotalIn,
        getLocationTotalOut,
        getFlowOriginId,
        getFlowDestId,
        getFlowMagnitude,
      });
    }
  }

  getPickingInfo(params: any): FlowLayerPickingInfo {
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
    const getLocationTotalWithin = selectors.getLocationTotalWithinGetter(this.props);

    return {
      ...info,
      object: {
        ...object,
        properties: {
          ...object.properties,
          totalIn: getLocationTotalIn(object),
          totalOut: getLocationTotalOut(object),
          totalWithin: getLocationTotalWithin(object),
        },
      },
    };
  }

  renderLayers() {
    const { showLocationAreas } = this.props;
    const { selectors } = this.state;

    const flows = selectors.getSortedNonSelfFlows(this.props);
    const activeFlows = selectors.getActiveFlows(this.props);

    const layers: DeckGLLayer[] = [];

    if (showLocationAreas) {
      layers.push(this.getLocationAreasLayer(LAYER_ID__LOCATION_AREAS));
    }
    layers.push(this.getFlowLinesLayer(LAYER_ID__FLOWS, flows, true));
    layers.push(this.getFlowLinesLayer(LAYER_ID__FLOWS_ACTIVE, activeFlows, false));
    layers.push(this.getNodesLayer(LAYER_ID__LOCATIONS));

    return layers;
  }

  private getLocationAreasLayer(id: string): DeckGLLayer {
    const { locations, selectedLocationIds, highlightedLocationId, highlightedFlow } = this.props;
    const { selectors } = this.state;
    const getLineColor = selectors.getLocationAreaLineColorGetter(this.props);
    const getFillColor = selectors.getLocationAreaFillColorGetter(this.props);

    return new GeoJsonLayer({
      id,
      getFillColor,
      getLineColor,
      lineJointRounded: true,
      data: locations,
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
      colors,
      showTotals,
      locationCircleSize,
      borderThickness,
    } = this.props;
    const { selectors } = this.state;

    const endpointOffsets: [number, number] = [(locationCircleSize || 0) + 1, (locationCircleSize || 0) + 1];
    const getLocationRadius = selectors.getLocationCircleRadiusGetter(this.props);
    const locationsById = selectors.getLocationsById(this.props);
    const flowThicknessScale = selectors.getFlowThicknessScale(this.props);
    const getSourcePosition: FlowAccessor<[number, number]> = flow =>
      getLocationCentroid(locationsById[getFlowOriginId(flow)]);
    const getTargetPosition: FlowAccessor<[number, number]> = flow =>
      getLocationCentroid(locationsById[getFlowDestId(flow)]);
    const getThickness: FlowAccessor<number> = flow => flowThicknessScale(getFlowMagnitude(flow));
    const getEndpointOffsets: FlowAccessor<[number, number]> = flow => {
      if (!showTotals) {
        return endpointOffsets;
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
      ...(colors.borderColor && { borderColor: colorAsArray(colors.borderColor) }),
      ...(borderThickness && { borderThickness }),
    });
  }

  private getNodesLayer(id: string): FlowCirclesLayer {
    const {
      highlightedLocationId,
      highlightedFlow,
      selectedLocationIds,
      getLocationCentroid,
      flows,
      showTotals,
    } = this.props;
    const { selectors } = this.state;

    const getRadius = showTotals
      ? selectors.getLocationCircleRadiusGetter(this.props)
      : () => this.props.locationCircleSize;
    const circles = selectors.getLocationCircles(this.props);
    const getColor = selectors.getLocationCircleColorGetter(this.props);
    const getPosition: LocationCircleAccessor<[number, number]> = locCircle => getLocationCentroid(locCircle.location);

    return new FlowCirclesLayer({
      id,
      getColor,
      getPosition,
      getRadius,
      data: circles,
      opacity: 1,
      pickable: true,
      updateTriggers: {
        getRadius: { selectedLocationIds, flows },
        getColor: { highlightedLocationId, highlightedFlow, selectedLocationIds, flows },
      },
    });
  }
}
