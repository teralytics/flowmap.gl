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

import { DeckGL } from '@deck.gl/react';
import FlowMapLayer, { BasicProps, Flow, FlowLayerPickingInfo, PickingType } from '@flowmap.gl/core';
import { BlendMode } from 'csstype';
import * as React from 'react';
import { StaticMap, ViewState, ViewStateChangeInfo } from 'react-map-gl';

const FLOW_MAP_LAYER_ID = 'flow-map-layer';

const enum HighlightType {
  LOCATION = 'location',
  FLOW = 'flow',
}

export interface LocationHighlight {
  type: HighlightType.LOCATION;
  locationId: string;
}

export interface FlowHighlight {
  type: HighlightType.FLOW;
  flow: Flow;
}

export type Highlight = LocationHighlight | FlowHighlight;

export interface Props extends BasicProps {
  initialViewState: ViewState;
  mapboxAccessToken: string;
  multiselect?: boolean;
  mixBlendMode?: BlendMode;
  onSelected?: (locationIds: string[] | undefined) => void;
  onHighlighted?: (highlight: Highlight | undefined, info: FlowLayerPickingInfo | undefined) => void;
}

export interface State {
  viewState?: ViewState;
  highlight?: Highlight;
  selectedLocationIds?: string[];
  time: number;
}

const ESC_KEY = 'Escape';

export default class FlowMap extends React.Component<Props, State> {
  static defaultProps: Partial<Props> = {
    mixBlendMode: 'multiply',
  };

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    if (props.selectedLocationIds && props.selectedLocationIds !== state.selectedLocationIds) {
      return {
        selectedLocationIds: props.selectedLocationIds,
      };
    }
    return null;
  }
  readonly state: State = {
    viewState: this.props.initialViewState,
    time: 0,
  };

  private animationFrame: number = -1;

  componentDidMount() {
    document.addEventListener('keydown', this.handleKeyDown);
    const { animate } = this.props;
    if (animate) {
      this.animate();
    }
  }

  componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<State>, snapshot?: any) {
    const { animate } = this.props;
    if (animate !== prevProps.animate) {
      if (animate) {
        this.animate();
      } else {
        this.stopAnimation();
      }
    }
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.handleKeyDown);
    this.stopAnimation();
  }

  render() {
    const { mapboxAccessToken, mixBlendMode } = this.props;
    const flowMapLayer = this.getFlowMapLayer();
    return (
      <>
        <DeckGL
          style={{ mixBlendMode }}
          layers={[flowMapLayer]}
          viewState={this.state.viewState}
          controller={true}
          onViewStateChange={this.handleViewStateChange}
          children={({ width, height, viewState }: any) => (
            <StaticMap width={width} height={height} mapboxApiAccessToken={mapboxAccessToken} viewState={viewState} />
          )}
        />
      </>
    );
  }

  private stopAnimation() {
    if (this.animationFrame) {
      window.cancelAnimationFrame(this.animationFrame);
    }
  }

  private animate = () => {
    const loopLength = 1800; // unit corresponds to the timestamp in source data
    const animationSpeed = 30; // unit time per second
    const timestamp = Date.now() / 1000;
    const loopTime = loopLength / animationSpeed;

    this.setState({
      time: ((timestamp % loopTime) / loopTime) * loopLength,
    });
    this.animationFrame = window.requestAnimationFrame(this.animate);
  };

  private getFlowMapLayer() {
    const {
      initialViewState,
      mapboxAccessToken,
      mixBlendMode,
      multiselect,
      onSelected,
      onHighlighted,
      ...flowMapLayerProps
    } = this.props;

    const { highlight, selectedLocationIds } = this.state;
    return new FlowMapLayer({
      id: FLOW_MAP_LAYER_ID,
      animationCurrentTime: this.state.time,
      ...flowMapLayerProps,
      selectedLocationIds,
      highlightedLocationId: highlight && highlight.type === HighlightType.LOCATION ? highlight.locationId : undefined,
      highlightedFlow: highlight && highlight.type === HighlightType.FLOW ? highlight.flow : undefined,
      onHover: this.handleFlowMapHover,
      onClick: this.handleFlowMapClick,
    });
  }

  private highlight(highlight: Highlight | undefined, info?: FlowLayerPickingInfo) {
    this.setState({ highlight });
    const { onHighlighted } = this.props;
    if (onHighlighted) {
      onHighlighted(highlight, info);
    }
  }

  private selectLocations(selectedLocationIds: string[] | undefined) {
    this.setState(state => ({
      ...state,
      selectedLocationIds,
    }));
    const { onSelected } = this.props;
    if (onSelected) {
      onSelected(selectedLocationIds);
    }
  }

  private handleFlowMapHover = (info: FlowLayerPickingInfo) => {
    const { type, object } = info;
    switch (type) {
      case PickingType.FLOW: {
        if (!object) {
          this.highlight(undefined);
        } else {
          this.highlight(
            {
              type: HighlightType.FLOW,
              flow: object,
            },
            info,
          );
        }
        break;
      }
      case PickingType.LOCATION: {
        const { getLocationId } = this.props;
        if (!object) {
          this.highlight(undefined);
        } else {
          this.highlight(
            {
              type: HighlightType.LOCATION,
              locationId: (getLocationId || FlowMapLayer.defaultProps.getLocationId.value)(object),
            },
            info,
          );
        }
        break;
      }
      case PickingType.LOCATION_AREA: {
        this.highlight(undefined);
        break;
      }
    }
  };

  private handleFlowMapClick = ({ type, object }: FlowLayerPickingInfo) => {
    switch (type) {
      case PickingType.LOCATION: {
        if (object) {
          const { getLocationId, multiselect } = this.props;
          const { selectedLocationIds } = this.state;
          const locationId = (getLocationId || FlowMapLayer.defaultProps.getLocationId.value)(object);
          const isSelected = selectedLocationIds && selectedLocationIds.indexOf(locationId) >= 0;
          let next: string[] | undefined;
          if (multiselect) {
            if (selectedLocationIds) {
              if (isSelected) {
                next = selectedLocationIds.filter(id => id !== locationId);
              } else {
                next = [...selectedLocationIds, locationId];
              }
            } else {
              next = [locationId];
            }
          } else {
            if (isSelected) {
              next = undefined;
            } else {
              next = [locationId];
            }
          }
          this.selectLocations(next);
          this.highlight(undefined);
        }
        break;
      }
      case PickingType.LOCATION_AREA:
        // do nothing
        break;
    }
  };

  private handleViewStateChange = ({ viewState }: ViewStateChangeInfo) =>
    this.setState({
      viewState,
      highlight: undefined,
    });

  private handleKeyDown = (evt: Event) => {
    if (evt instanceof KeyboardEvent && evt.key === ESC_KEY) {
      this.setState({
        selectedLocationIds: undefined,
        highlight: undefined,
      });
    }
  };
}
