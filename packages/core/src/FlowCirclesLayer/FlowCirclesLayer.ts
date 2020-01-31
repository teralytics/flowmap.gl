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

import {Layer, picking, project32} from '@deck.gl/core';
import {DOUBLE, TRIANGLE_FAN, UNSIGNED_BYTE} from '@luma.gl/constants';
import {Geometry, Model} from '@luma.gl/core';
import {RGBA} from '../colors';
import FragmentShader from './FlowCirclesLayerFragment.glsl';
import VertexShader from './FlowCirclesLayerVertex.glsl';
import {LayerProps} from "@deck.gl/core/lib/layer";

export type FlowCirclesDatum = any;

export interface Props extends LayerProps {
  id: string;
  opacity?: number;
  pickable?: boolean;
  updateTriggers?: { [key: string]: {} };
  getColor?: (d: FlowCirclesDatum) => RGBA;
  getPosition?: (d: FlowCirclesDatum) => [number, number];
  getRadius?: (d: FlowCirclesDatum) => number;
  data: FlowCirclesDatum[];
}

const DEFAULT_COLOR = [0, 0, 0, 255];

class FlowCirclesLayer extends Layer {
  static layerName: string = 'FlowCirclesLayer';

  static defaultProps = {
    getColor: { type: 'accessor', value: DEFAULT_COLOR },
    getPosition: { type: 'accessor', value: (d: FlowCirclesDatum) => d.position },
    getRadius: { type: 'accessor', value: 1 },
    parameters: {
      depthTest: false,
    },
  };
  props!: Props;

  constructor(props: Props) {
    super(props);
  }

  getShaders() {
    return super.getShaders({
      vs: VertexShader,
      fs: FragmentShader,
      modules: [project32, picking],
    });
  }

  initializeState() {
    this.getAttributeManager().addInstanced({
      instancePositions: {
        size: 3,
        type: DOUBLE,
        fp64: this.use64bitPositions(),
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
        defaultValue: DEFAULT_COLOR,
      },
    });
  }

  updateState({ props, oldProps, changeFlags }: any) {
    super.updateState({ props, oldProps, changeFlags });
    if (changeFlags.extensionsChanged) {
      const { gl } = this.context;
      if (this.state.model) {
        this.state.model.delete();
      }
      this.setState({ model: this._getModel(gl) });
      this.getAttributeManager().invalidateAll();
    }
  }

  draw({ uniforms }: any) {
    this.state.model.setUniforms(uniforms).draw();
  }

  _getModel(gl: WebGLRenderingContext) {
    // a square that minimally cover the unit circle
    const positions = [-1, -1, 0, -1, 1, 0, 1, 1, 0, 1, -1, 0];

    return new Model(
      gl,
      Object.assign(this.getShaders(), {
        id: this.props.id,
        geometry: new Geometry({
          drawMode: TRIANGLE_FAN,
          vertexCount: 4,
          attributes: {
            positions: { size: 3, value: new Float32Array(positions) },
          },
        }),
        isInstanced: true,
      }),
    );
  }
}

export default FlowCirclesLayer;
