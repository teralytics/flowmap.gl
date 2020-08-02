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
import { LayerProps } from './LayerProps';
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

export interface BasicProps extends LayerProps {
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
  getAnimatedFlowLineStaggering?: FlowAccessor<number>;
  getFlowColor?: FlowAccessor<string | undefined>;
  maxFlowThickness?: number;
  flowMagnitudeExtent?: [number, number];
  maxLocationCircleSize?: number;
  minPickableFlowThickness?: number;
  showTotals?: boolean;
  showLocationAreas?: boolean;
  showOnlyTopFlows?: number;
  selectedLocationIds?: string[];
  highlightedLocationId?: string;
  highlightedLocationAreaId?: string;
  highlightedFlow?: Flow;
  outlineThickness?: number;
  updateTriggers?: {
    getFlowLinesSourcePosition?: any;
    getFlowLinesTargetPosition?: any;
    getFlowLinesThickness?: any;
    getFlowLinesEndpointOffsets?: any;
    getFlowLinesColor?: any;
    getCirclesRadius?: any;
    getCirclesColor?: any;
    getLocationAreasFillColor?: any;
    getLocationAreasLineColor?: any;
  };
}

export interface Props extends BasicProps {
  id: string;
  onClick?: PickingHandler<FlowLayerPickingInfo>;
  onHover?: PickingHandler<FlowLayerPickingInfo>;
}

enum LayerKind {
  LOCATIONS = 'LOCATIONS',
  LOCATION_AREAS = 'LOCATION_AREAS',
  LOCATION_AREAS_OUTLINES = 'LOCATION_AREAS_OUTLINES',
  LOCATION_AREAS_SELECTED_AND_HIGHLIGHTED = 'LOCATION_AREAS_SELECTED_AND_HIGHLIGHTED',
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
    maxLocationCircleSize: 15,
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
      layers.push(this.getLocationAreasLayer(getLayerId(this.props.id, LayerKind.LOCATION_AREAS), false));
    }
    layers.push(
      this.getFlowLinesLayer(getLayerId(this.props.id, LayerKind.FLOWS), topFlows, false, isLocationHighlighted),
    );

    if (showLocationAreas && isFeatureCollection(locations)) {
      layers.push(
        this.getHighlightedLocationAreasLayer(
          getLayerId(this.props.id, LayerKind.LOCATION_AREAS_SELECTED_AND_HIGHLIGHTED),
        ),
      );
    }

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
    if (showLocationAreas && isFeatureCollection(locations)) {
      layers.push(this.getLocationAreasLayer(getLayerId(this.props.id, LayerKind.LOCATION_AREAS_OUTLINES), true));
    }
    return layers;
  }

  private getLocationAreasLayer(id: string, outline: boolean): DeckGLLayer {
    const { locations, selectedLocationIds, highlightedLocationId, highlightedFlow, updateTriggers } = this.props;
    const { selectors } = this.state;
    const colors = selectors.getColors(this.props);

    return new GeoJsonLayer(
      this.getSubLayerProps({
        id,
        getFillColor: selectors.getLocationAreaFillColorGetter(this.props),
        getLineColor: colors.locationAreas.outline,
        lineJointRounded: true,
        data: locations,
        stroked: outline,
        filled: !outline,
        ...(outline && { pickable: false }),
        lineWidthMinPixels: 1,
        pointRadiusMinPixels: 1,
        updateTriggers: {
          getFillColor: {
            colors,
            ...(outline && { selectedLocationIds, highlightedLocationId, highlightedFlow }),
            ...updateTriggers?.getLocationAreasFillColor,
          },
          getLineColor: {
            colors,
            ...updateTriggers?.getLocationAreasLineColor,
          },
        },
      }),
    );
  }

  private getHighlightedLocationAreasLayer(id: string): DeckGLLayer {
    const { selectors } = this.state;
    const { highlightedLocationId, highlightedLocationAreaId, updateTriggers } = this.props;
    const colors = selectors.getColors(this.props);
    const getLocationById = selectors.getLocationByIdGetter(this.props);

    return new GeoJsonLayer(
      this.getSubLayerProps({
        id,
        getFillColor: () => colors.locationAreas.highlighted,
        getLineColor: colors.locationAreas.outline,
        lineJointRounded: true,
        data: highlightedLocationId
          ? getLocationById(highlightedLocationId)
          : highlightedLocationAreaId
          ? getLocationById(highlightedLocationAreaId)
          : undefined,
        stroked: false,
        filled: true,
        pickable: false,
        lineWidthMinPixels: 5,
        updateTriggers: {
          getFillColor: {
            colors,
            ...updateTriggers?.getLocationAreasFillColor,
          },
          getLineColor: {
            colors,
            ...updateTriggers?.getLocationAreasLineColor,
          },
        },
      }),
    );
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
      getAnimatedFlowLineStaggering,
      showTotals,
      maxLocationCircleSize,
      outlineThickness,
      minPickableFlowThickness,
      maxFlowThickness,
      flowMagnitudeExtent,
      updateTriggers,
    } = this.props;
    const { selectors } = this.state;

    const endpointOffsets: [number, number] = [(maxLocationCircleSize || 0) + 1, (maxLocationCircleSize || 0) + 1];
    const getLocationRadius = selectors.getLocationCircleRadiusGetter(this.props);
    const getLocationById = selectors.getLocationByIdGetter(this.props);
    const flowThicknessScale = selectors.getFlowThicknessScale(this.props);
    const getSourcePosition: FlowAccessor<[number, number]> = (flow, info) =>
      getLocationCentroid!(getLocationById(getFlowOriginId!(flow, info)));
    const getTargetPosition: FlowAccessor<[number, number]> = (flow, info) =>
      getLocationCentroid!(getLocationById(getFlowDestId!(flow, info)));
    const getThickness: FlowAccessor<number> = (flow, info) => flowThicknessScale(getFlowMagnitude!(flow, info));
    const getEndpointOffsets: FlowAccessor<[number, number]> = (flow, info) => {
      if (!showTotals) {
        return endpointOffsets;
      }

      return [
        getLocationRadius({
          location: getLocationById(getFlowOriginId!(flow, info)),
          type: LocationCircleType.OUTLINE,
        }),
        getLocationRadius({
          location: getLocationById(getFlowDestId!(flow, info)),
          type: LocationCircleType.OUTLINE,
        }),
      ];
    };
    const flowColorScale = selectors.getFlowColorScale(this.props);
    const colors = selectors.getColors(this.props);
    const getColor = selectors.getFlowLinesColorGetter(colors, flowColorScale, highlighted, dimmed);
    const { animate } = this.props;

    const thicknessUnit = maxFlowThickness != null ? maxFlowThickness : FlowLinesLayer.defaultProps.thicknessUnit;
    const baseProps = {
      id,
      getSourcePosition,
      getTargetPosition,
      getThickness,
      getEndpointOffsets,
      getColor,
      data: flows,
      ...(highlighted && { pickable: false }),
      drawOutline: !dimmed,
      updateTriggers: {
        getSourcePosition: updateTriggers?.getFlowLinesSourcePosition,
        getTargetPosition: updateTriggers?.getFlowLinesTargetPosition,
        getThickness: {
          flowMagnitudeExtent,
          maxFlowThickness,
          ...updateTriggers?.getFlowLinesThickness,
        },
        getColor: {
          colors,
          dimmed,
          ...updateTriggers?.getFlowLinesColor,
        },
        getEndpointOffsets: {
          showTotals,
          ...updateTriggers?.getFlowLinesEndpointOffsets,
        },
      },
      thicknessUnit,
      outlineColor: colors.outlineColor,
      ...(outlineThickness && { outlineThickness }),
      ...(minPickableFlowThickness != null && {
        getPickable: (f: Flow) => (thicknessUnit * getThickness(f) >= minPickableFlowThickness ? 1.0 : 0.0),
      }),
      parameters: {
        ...this.props.parameters,
        depthTest: false,
      },
    };
    if (animate) {
      return new AnimatedFlowLinesLayer(
        this.getSubLayerProps({
          ...baseProps,
          currentTime: this.props.animationCurrentTime,
          ...(getAnimatedFlowLineStaggering && {
            getStaggering: getAnimatedFlowLineStaggering,
          }),
        }),
      );
    } else {
      return new FlowLinesLayer(this.getSubLayerProps(baseProps));
    }
  }

  private getLocationCirclesLayer(id: string, circles: LocationCircle[], highlighted: boolean): FlowCirclesLayer {
    const {
      highlightedLocationId,
      selectedLocationIds,
      getLocationCentroid,
      flows,
      showTotals,
      updateTriggers,
      maxLocationCircleSize,
    } = this.props;
    const { selectors } = this.state;

    const getRadius = showTotals ? selectors.getLocationCircleRadiusGetter(this.props) : () => maxLocationCircleSize;
    const colors = selectors.getColors(this.props);
    const getColor = selectors.getLocationCircleColorGetter(this.props);
    const getPosition: LocationCircleAccessor<[number, number]> = locCircle => getLocationCentroid!(locCircle.location);

    return new FlowCirclesLayer(
      this.getSubLayerProps({
        id,
        getColor,
        getPosition,
        getRadius,
        data: circles,
        updateTriggers: {
          getRadius: {
            showTotals,
            selectedLocationIds,
            maxLocationCircleSize,
            flows,
            ...updateTriggers?.getCirclesRadius,
          },
          getColor: {
            colors,
            highlightedLocationId,
            selectedLocationIds,
            flows,
            ...updateTriggers?.getCirclesColor,
          },
        },
        parameters: {
          ...this.props.parameters,
          depthTest: false,
        },
      }),
    );
  }
}
