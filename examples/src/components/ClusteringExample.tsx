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

import ClusterTree, { getLocationWeightGetter } from '@flowmap.gl/cluster';
import { ClusteredFlowsByZoom } from '@flowmap.gl/cluster';
import * as React from 'react';
import { ViewState } from 'react-map-gl';
import { Flow, getFlowDestId, getFlowMagnitude, getFlowOriginId, Location } from '../types';
import Example from './Example';

export interface Props {
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
    const { locations, flows } = this.props;
    const clusterTree = new ClusterTree(
      locations,
      getLocationWeightGetter(flows, { getFlowOriginId, getFlowDestId, getFlowMagnitude }),
    );
    const clusteredFlows = clusterTree.clusterFlows(flows, { getFlowOriginId, getFlowDestId, getFlowMagnitude });
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
    const { clusterTree, clusteredFlows, clusterZoom } = this.state;
    const locations = clusterTree.getItemsFor(clusterZoom) as Location[] | undefined;
    const flows = clusteredFlows.get(clusterZoom);
    if (!locations || !flows) {
      return null;
    }
    return <Example locations={locations} flows={flows} onViewStateChange={this.handleViewStateChange} />;
  }
}

export default ClusteringExample;
