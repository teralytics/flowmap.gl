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

import { CompositeLayer } from '@deck.gl/core';
import { GeoJsonLayer } from '@deck.gl/layers';
import AnimatedFlowLinesLayer from './AnimatedFlowLinesLayer/AnimatedFlowLinesLayer';
import { Colors, DiffColors } from './colors';
import FlowCirclesLayer from './FlowCirclesLayer/FlowCirclesLayer';
import FlowLinesLayer from './FlowLinesLayer/FlowLinesLayer';
import Selectors from './Selectors';
import {
  DeckGLLayer,
  Flow,
  FlowAccessor,
  FlowLayerPickingInfo,
  isFeatureCollection,
  Location,
  LocationAccessor,
  LocationCircle,
  LocationCircleAccessor,
  LocationCircleType,
  Locations,
  PickingHandler,
  PickingType,
} from './types';

export interface BasicProps {
  locations: Locations;
  flows: Flow[];
  diffMode?: boolean;
  animate?: boolean;
  animationCurrentTime?: number;
  colors?: Colors | DiffColors;
  getLocationId?: LocationAccessor<string>;
  getLocationCentroid?: LocationAccessor<[number, number]>;
  getLocationTotalIn?: LocationAccessor<number>;
  getLocationTotalOut?: LocationAccessor<number>;
  getLocationTotalWithin?: LocationAccessor<number>;
  getFlowOriginId?: FlowAccessor<string>;
  getFlowDestId?: FlowAccessor<string>;
  getFlowMagnitude?: FlowAccessor<number>;
  getFlowColor?: FlowAccessor<string | undefined>;
  showTotals?: boolean;
  locationCircleSize?: number;
  showLocationAreas?: boolean;
  showOnlyTopFlows?: number;
  selectedLocationIds?: string[];
  highlightedLocationId?: string;
  highlightedFlow?: Flow;
  outlineThickness?: number;
}

export interface Props extends BasicProps {
  id: string;
  onClick?: PickingHandler<FlowLayerPickingInfo>;
  onHover?: PickingHandler<FlowLayerPickingInfo>;
}

enum LayerKind {
  LOCATIONS = 'LOCATIONS',
  LOCATION_AREAS = 'LOCATION_AREAS',
  FLOWS = 'FLOWS',
  LOCATIONS_HIGHLIGHTED = 'LOCATIONS_HIGHLIGHTED',
  FLOWS_HIGHLIGHTED = 'FLOWS_HIGHLIGHTED',
}

const LAYER_ID_SEPARATOR = ':::';

function getLayerId(baseLayerId: string, layerKind: LayerKind) {
  return `${baseLayerId}${LAYER_ID_SEPARATOR}${layerKind.valueOf()}`;
}

function getLayerKind(id: string): LayerKind {
  const kind = id.substr(id.lastIndexOf(LAYER_ID_SEPARATOR) + LAYER_ID_SEPARATOR.length);
  return LayerKind[kind as keyof typeof LayerKind];
}

function getPickType({ id }: DeckGLLayer): PickingType | undefined {
  switch (getLayerKind(id)) {
    case LayerKind.FLOWS:
    case LayerKind.FLOWS_HIGHLIGHTED:
      return PickingType.FLOW;
    case LayerKind.LOCATIONS:
    case LayerKind.LOCATIONS_HIGHLIGHTED:
      return PickingType.LOCATION;
    case LayerKind.LOCATION_AREAS:
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
    getFlowMagnitude: { type: 'accessor', value: (f: Flow) => f.count },
    showTotals: true,
    locationCircleSize: 3,
    outlineThickness: 1,
    showLocationAreas: true,
  };
  props!: Props;

  constructor(props: Props) {
    super(props);
  }

  initializeState() {
    const {
      getLocationTotalIn,
      getLocationTotalOut,
      getLocationTotalWithin,
      getLocationId,
      getLocationCentroid,
      getFlowOriginId,
      getFlowDestId,
      getFlowMagnitude,
      getFlowColor,
    } = this.props;
    const selectors = new Selectors({
      getLocationId: getLocationId!,
      getLocationCentroid: getLocationCentroid!,
      getLocationTotalIn,
      getLocationTotalOut,
      getLocationTotalWithin,
      getFlowOriginId: getFlowOriginId!,
      getFlowDestId: getFlowDestId!,
      getFlowMagnitude: getFlowMagnitude!,
      getFlowColor,
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
        getLocationTotalWithin,
        getLocationId,
        getLocationCentroid,
        getFlowOriginId,
        getFlowDestId,
        getFlowMagnitude,
        getFlowColor,
      } = props;
      this.state.selectors.setInputAccessors({
        getLocationId,
        getLocationCentroid,
        getLocationTotalIn,
        getLocationTotalOut,
        getLocationTotalWithin,
        getFlowOriginId,
        getFlowDestId,
        getFlowMagnitude,
        getFlowColor,
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

    const { selectors } = this.state;
    if (type === PickingType.FLOW) {
      const getLocationById = selectors.getLocationByIdGetter(this.props);
      const { getFlowOriginId, getFlowDestId } = selectors.getInputAccessors();
      const flow = info.object as Flow;
      return {
        ...info,
        ...(flow && {
          origin: getLocationById(getFlowOriginId(flow)),
          dest: getLocationById(getFlowDestId(flow)),
        }),
      };
    }

    if (type === PickingType.LOCATION || type === PickingType.LOCATION_AREA) {
      const location: Location = type === PickingType.LOCATION ? info.object && info.object.location : info.object;
      const getLocationTotalIn = selectors.getLocationTotalInGetter(this.props);
      const getLocationTotalOut = selectors.getLocationTotalOutGetter(this.props);
      const getLocationTotalWithin = selectors.getLocationTotalWithinGetter(this.props);
      const getLocationCircleRadius = selectors.getLocationCircleRadiusGetter(this.props);

      return {
        ...info,
        ...(location && {
          object: location,
          totalIn: getLocationTotalIn(location),
          totalOut: getLocationTotalOut(location),
          totalWithin: getLocationTotalWithin(location),
          circleRadius: getLocationCircleRadius({ location, type: LocationCircleType.OUTER }),
        }),
      };
    }

    return info;
  }

  renderLayers() {
    const { showLocationAreas, locations, highlightedLocationId } = this.props;
    const { selectors } = this.state;

    const topFlows = selectors.getTopFlows(this.props);
    const highlightedFlows = selectors.getHighlightedFlows(this.props);
    const isLocationHighlighted = highlightedLocationId != null;
    const locationCircles = selectors.getLocationCircles(this.props);

    const layers: DeckGLLayer[] = [];

    if (showLocationAreas && isFeatureCollection(locations)) {
      layers.push(this.getLocationAreasLayer(getLayerId(this.props.id, LayerKind.LOCATION_AREAS)));
    }
    layers.push(
      this.getFlowLinesLayer(getLayerId(this.props.id, LayerKind.FLOWS), topFlows, false, isLocationHighlighted),
    );
    if (highlightedFlows) {
      layers.push(
        this.getFlowLinesLayer(getLayerId(this.props.id, LayerKind.FLOWS_HIGHLIGHTED), highlightedFlows, true, false),
      );
    }
    layers.push(this.getLocationCirclesLayer(getLayerId(this.props.id, LayerKind.LOCATIONS), locationCircles, false));
    if (isLocationHighlighted) {
      const highlightedLocationCircles = selectors.getHighlightedLocationCircles(this.props);
      layers.push(
        this.getLocationCirclesLayer(
          getLayerId(this.props.id, LayerKind.LOCATIONS_HIGHLIGHTED),
          highlightedLocationCircles,
          true,
        ),
      );
    }
    return layers;
  }

  private getLocationAreasLayer(id: string): DeckGLLayer {
    const { locations, selectedLocationIds, highlightedLocationId, highlightedFlow } = this.props;
    const { selectors } = this.state;
    const colors = selectors.getColors(this.props);

    return new GeoJsonLayer({
      id,
      getFillColor: selectors.getLocationAreaFillColorGetter(this.props),
      getLineColor: colors.locationAreas.outline,
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

  private getFlowLinesLayer(
    id: string,
    flows: Flow[],
    highlighted: boolean,
    dimmed: boolean,
  ): FlowLinesLayer | AnimatedFlowLinesLayer {
    const {
      getFlowOriginId,
      getFlowDestId,
      getFlowMagnitude,
      getLocationCentroid,
      showTotals,
      locationCircleSize,
      outlineThickness,
    } = this.props;
    const { selectors } = this.state;

    const endpointOffsets: [number, number] = [(locationCircleSize || 0) + 1, (locationCircleSize || 0) + 1];
    const getLocationRadius = selectors.getLocationCircleRadiusGetter(this.props);
    const getLocationById = selectors.getLocationByIdGetter(this.props);
    const flowThicknessScale = selectors.getFlowThicknessScale(this.props);
    const getSourcePosition: FlowAccessor<[number, number]> = flow =>
      getLocationCentroid!(getLocationById(getFlowOriginId!(flow)));
    const getTargetPosition: FlowAccessor<[number, number]> = flow =>
      getLocationCentroid!(getLocationById(getFlowDestId!(flow)));
    const getThickness: FlowAccessor<number> = flow => flowThicknessScale(getFlowMagnitude!(flow));
    const getEndpointOffsets: FlowAccessor<[number, number]> = flow => {
      if (!showTotals) {
        return endpointOffsets;
      }

      return [
        getLocationRadius({
          location: getLocationById(getFlowOriginId!(flow)),
          type: LocationCircleType.OUTLINE,
        }),
        getLocationRadius({
          location: getLocationById(getFlowDestId!(flow)),
          type: LocationCircleType.OUTLINE,
        }),
      ];
    };
    const flowColorScale = selectors.getFlowColorScale(this.props);
    const colors = selectors.getColors(this.props);
    const getColor = selectors.getFlowLinesColorGetter(colors, flowColorScale, highlighted, dimmed);

    const baseProps = {
      id,
      getSourcePosition,
      getTargetPosition,
      getThickness,
      getEndpointOffsets,
      getColor,
      data: flows,
      opacity: 1,
      pickable: !highlighted,
      drawOutline: !dimmed,
      updateTriggers: {
        getColor: { dimmed },
        getEndpointOffsets: {
          showTotals,
        },
      },
      outlineColor: colors.outlineColor,
      ...(outlineThickness && { outlineThickness }),
    };
    const { animate } = this.props;
    if (animate) {
      return new AnimatedFlowLinesLayer({
        ...baseProps,
        currentTime: this.props.animationCurrentTime,
      });
    } else {
      return new FlowLinesLayer(baseProps);
    }
  }

  private getLocationCirclesLayer(id: string, circles: LocationCircle[], highlighted: boolean): FlowCirclesLayer {
    const { highlightedLocationId, selectedLocationIds, getLocationCentroid, flows, showTotals } = this.props;
    const { selectors } = this.state;

    const getRadius = showTotals
      ? selectors.getLocationCircleRadiusGetter(this.props)
      : () => this.props.locationCircleSize;
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
      updateTriggers: {
        getRadius: { selectedLocationIds, flows },
        getColor: { highlightedLocationId, selectedLocationIds, flows },
      },
    });
  }
}
