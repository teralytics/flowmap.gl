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

import * as Cluster from '@flowmap.gl/cluster';
import { Flow, FlowAccessors, isFeatureCollection, Location, LocationAccessors } from '@flowmap.gl/core';
import React from 'react';
import { ViewState } from 'react-map-gl';
import Example from './Example';

export interface Props extends FlowAccessors, LocationAccessors {
  flows: Flow[];
  locations: Location[];
  clusterLevels?: Cluster.ClusterLevel[];
}

interface State {
  clusteredLocations: Location[] | undefined;
  aggregateFlows: Flow[] | undefined;
}

class ClusteringExample extends React.Component<Props, State> {
  private readonly clusterIndex: Cluster.ClusterIndex;
  private readonly aggregateFlowsByZoom: Map<number, Flow[]>;

  constructor(props: Props) {
    super(props);
    const { flows, getLocationId, getLocationCentroid, getFlowOriginId, getFlowDestId, getFlowMagnitude } = this.props;
    let clusterLevels;
    const locations = isFeatureCollection(this.props.locations) ? this.props.locations.features : this.props.locations;
    if (this.props.clusterLevels) {
      clusterLevels = this.props.clusterLevels;
    } else {
      const getLocationWeight = Cluster.makeLocationWeightGetter(flows, {
        getFlowOriginId,
        getFlowDestId,
        getFlowMagnitude,
      });
      clusterLevels = Cluster.clusterLocations(locations, { getLocationId, getLocationCentroid }, getLocationWeight, {
        makeClusterName: (id: number, numPoints: number) => `Cluster #${id} of ${numPoints} locations`,
      });
    }
    const clusterIndex = Cluster.buildIndex(clusterLevels);
    const aggregateFlowsByZoom = new Map<number, Flow[]>();
    for (const zoom of clusterIndex.availableZoomLevels) {
      aggregateFlowsByZoom.set(
        zoom,
        clusterIndex.aggregateFlows(flows, zoom, { getFlowOriginId, getFlowDestId, getFlowMagnitude }),
      );
    }
    const maxZoom = Math.max.apply(null, clusterIndex.availableZoomLevels);
    this.clusterIndex = clusterIndex;
    this.aggregateFlowsByZoom = aggregateFlowsByZoom;
    this.state = {
      clusteredLocations: this.clusterIndex.getClusterNodesFor(maxZoom),
      aggregateFlows: this.aggregateFlowsByZoom.get(maxZoom),
    };
  }

  handleViewStateChange = (viewState: ViewState) => {
    const { availableZoomLevels } = this.clusterIndex;
    const { zoom } = viewState;
    const clusterZoom = Cluster.findAppropriateZoomLevel(availableZoomLevels, zoom);
    this.setState({
      clusteredLocations: this.clusterIndex.getClusterNodesFor(clusterZoom),
      aggregateFlows: this.aggregateFlowsByZoom.get(clusterZoom),
    });
  };

  render() {
    const { getFlowOriginId, getFlowDestId, getFlowMagnitude } = this.props;
    const { clusteredLocations, aggregateFlows } = this.state;
    if (!clusteredLocations || !aggregateFlows) {
      return null;
    }
    return (
      <Example
        locations={clusteredLocations}
        flows={aggregateFlows}
        getLocationId={(loc: Cluster.ClusterNode) => loc.id}
        getLocationCentroid={(loc: Cluster.ClusterNode) => loc.centroid}
        getFlowOriginId={(flow: Flow) => (Cluster.isAggregateFlow(flow) ? flow.origin : getFlowOriginId(flow))}
        getFlowDestId={(flow: Flow) => (Cluster.isAggregateFlow(flow) ? flow.dest : getFlowDestId(flow))}
        getFlowMagnitude={(flow: Flow) => (Cluster.isAggregateFlow(flow) ? flow.count : getFlowMagnitude(flow))}
        onViewStateChange={this.handleViewStateChange}
      />
    );
  }
}

export default ClusteringExample;
