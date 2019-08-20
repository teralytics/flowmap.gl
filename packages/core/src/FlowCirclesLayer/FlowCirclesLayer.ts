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

import { Layer } from '@deck.gl/core';
import { TRIANGLE_FAN, UNSIGNED_BYTE } from '@luma.gl/constants';
import { Geometry, Model } from '@luma.gl/core';
import { RGBA } from '../colors';
import FragmentShader from './FlowCirclesLayerFragment.glsl';
import VertexShader from './FlowCirclesLayerVertex.glsl';

export type FlowCirclesDatum = any;

export interface Props {
  id: string;
  opacity?: number;
  pickable?: boolean;
  updateTriggers?: { [key: string]: {} };
  getColor?: (d: FlowCirclesDatum) => RGBA;
  getPosition: (d: FlowCirclesDatum) => [number, number];
  getRadius: (d: FlowCirclesDatum) => number;
  data: FlowCirclesDatum[];
}

class FlowCirclesLayer extends Layer {
  static layerName: string = 'FlowCirclesLayer';

  static defaultProps = {
    parameters: {
      depthTest: false,
    },
  };
  props!: Props;

  constructor(props: Props) {
    super(props);
  }

  getShaders() {
    return {
      vs: VertexShader,
      fs: FragmentShader,
      modules: ['project32', 'picking'],
      shaderCache: this.context.shaderCache,
    };
  }

  initializeState() {
    const { gl } = this.context;
    this.setState({ model: this.createModel(gl) });

    this.getAttributeManager().addInstanced({
      instancePositions: {
        size: 3,
        transition: true,
        accessor: 'getPosition',
      },
      instanceRadius: {
        size: 1,
        transition: true,
        accessor: 'getRadius',
        defaultValue: 1,
      },
      instanceColors: {
        size: 4,
        transition: true,
        type: UNSIGNED_BYTE,
        accessor: 'getColor',
        defaultValue: [0, 0, 0, 255],
      },
    });
  }

  createModel(gl: WebGLRenderingContext) {
    // a square that minimally cover the unit circle
    const positions = [-1, -1, 0, -1, 1, 0, 1, 1, 0, 1, -1, 0];

    return new Model(
      gl,
      Object.assign(this.getShaders(), {
        id: this.props.id,
        geometry: new Geometry({
          drawMode: TRIANGLE_FAN,
          attributes: {
            positions: new Float32Array(positions),
          },
        }),
        isInstanced: true,
        shaderCache: this.context.shaderCache,
      }),
    );
  }
}

export default FlowCirclesLayer;
