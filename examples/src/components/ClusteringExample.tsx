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
import * as React from 'react';
import { ViewState } from 'react-map-gl';
import Example from './Example';

export interface Props extends FlowAccessors, LocationAccessors {
  flows: Flow[];
  locations: Location[];
  clusterLevels?: Cluster.ClusterLevel[];
}

interface State {
  clusteredLocations: Location[];
  aggregateFlows: Flow[];
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
      const getLocationWeight = Cluster.getLocationWeightGetter(flows, {
        getFlowOriginId,
        getFlowDestId,
        getFlowMagnitude,
      });
      clusterLevels = Cluster.clusterLocations(
        locations,
        { getLocationId, getLocationCentroid },
        getLocationWeight,
        (id: string, numPoints: number) => `Cluster #${id} of ${numPoints} locations`,
      );
    }
    const clusterIndex = Cluster.buildIndex(clusterLevels, locations, {
      getLocationId,
      getLocationCentroid,
    });
    const aggregateFlowsByZoom = new Map<number, Flow[]>();
    for (const zoom of clusterIndex.availableZoomLevels) {
      aggregateFlowsByZoom.set(
        zoom,
        clusterIndex.aggregateFlows(flows, zoom, { getFlowOriginId, getFlowDestId, getFlowMagnitude }),
      );
    }
    this.clusterIndex = clusterIndex;
    this.aggregateFlowsByZoom = aggregateFlowsByZoom;
    this.state = {
      clusteredLocations: locations,
      aggregateFlows: flows,
    };
  }

  handleViewStateChange = (viewState: ViewState) => {
    const { locations, flows } = this.props;
    const { availableZoomLevels } = this.clusterIndex;
    const { zoom } = viewState;
    const clusterZoom = Cluster.findAppropriateZoomLevel(availableZoomLevels, zoom);
    this.setState({
      clusteredLocations: this.clusterIndex.getLocationItemsFor(clusterZoom) || locations,
      aggregateFlows: this.aggregateFlowsByZoom.get(clusterZoom) || flows,
    });
  };

  render() {
    const { getLocationId, getLocationCentroid, getFlowOriginId, getFlowDestId, getFlowMagnitude } = this.props;
    const { clusteredLocations, aggregateFlows } = this.state;
    if (!clusteredLocations || !aggregateFlows) {
      return null;
    }
    return (
      <Example
        locations={clusteredLocations}
        flows={aggregateFlows}
        {...{ getLocationId, getLocationCentroid, getFlowOriginId, getFlowDestId, getFlowMagnitude }}
        onViewStateChange={this.handleViewStateChange}
      />
    );
  }
}

export default ClusteringExample;
