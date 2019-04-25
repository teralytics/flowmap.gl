/*
 * Copyright 2019 Teralytics
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

import ClusterTree, {
  ClusteredFlowsByZoom,
  clusterLocationsByCentroidDistance,
  getLocationWeightGetter,
} from '@flowmap.gl/cluster';
import { Flow, FlowAccessors, isFeatureCollection, Location, LocationAccessors } from '@flowmap.gl/core';
import * as React from 'react';
import { ViewState } from 'react-map-gl';
import Example from './Example';

export interface Props extends FlowAccessors, LocationAccessors {
  flows: Flow[];
  locations: Location[];
}

interface State {
  clusterTree: ClusterTree;
  clusteredFlows: ClusteredFlowsByZoom;
  clusterZoom: number;
}

class ClusteringExample extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    const { getLocationId, getLocationCentroid } = this.props;
    const { locations, flows, getFlowOriginId, getFlowDestId, getFlowMagnitude } = this.props;
    const getLocationWeight = getLocationWeightGetter(flows, { getFlowOriginId, getFlowDestId, getFlowMagnitude });
    const clusterTree = clusterLocationsByCentroidDistance(
      isFeatureCollection(locations) ? locations.features : locations,
      { getLocationId, getLocationCentroid },
      getLocationWeight,
      (id: string, numPoints: number) => `Cluster #${id} of ${numPoints} locations`,
    );
    const clusteredFlows = clusterTree.aggregateFlows(flows, { getFlowOriginId, getFlowDestId, getFlowMagnitude });
    this.state = {
      clusterTree,
      clusteredFlows,
      clusterZoom: clusterTree.maxZoom,
    };
  }

  handleViewStateChange = (viewState: ViewState) => {
    const { minZoom, maxZoom } = this.state.clusterTree;
    const { zoom } = viewState;
    this.setState({
      clusterZoom: Math.max(minZoom, Math.min(Math.floor(zoom), maxZoom)),
    });
  };

  render() {
    const { getLocationId, getLocationCentroid, getFlowOriginId, getFlowDestId, getFlowMagnitude } = this.props;
    const { clusterTree, clusteredFlows, clusterZoom } = this.state;
    const locations = clusterTree.getItemsFor(clusterZoom) as Location[] | undefined;
    const flows = clusteredFlows.get(clusterZoom);
    if (!locations || !flows) {
      return null;
    }
    return (
      <Example
        locations={locations}
        flows={flows}
        {...{ getLocationId, getLocationCentroid, getFlowOriginId, getFlowDestId, getFlowMagnitude }}
        onViewStateChange={this.handleViewStateChange}
      />
    );
  }
}

export default ClusteringExample;
