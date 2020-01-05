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

/*
 * This file was modified by Teralytics. The original file is licenced under:
 *
 * Copyright (c) 2015-2017 Uber Technologies, Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

import { Layer } from '@deck.gl/core';
import { TRIANGLE_STRIP, UNSIGNED_BYTE } from '@luma.gl/constants';
import { Geometry, Model } from '@luma.gl/core';
import { RGBA } from '../colors';
import { AccessorObjectInfo, Flow } from '../types';
import FragmentShader from './AnimatedFlowLinesLayerFragment.glsl';
import VertexShader from './AnimatedFlowLinesLayerVertex.glsl';

export interface Props {
  id: string;
  opacity?: number;
  pickable?: boolean;
  updateTriggers?: { [key: string]: {} };
  data: Flow[];
  drawOutline: boolean;
  outlineColor?: RGBA;
  outlineThickness?: number;
  currentTime?: number;
  thicknessUnit?: number;
  getSourcePosition?: (d: Flow) => [number, number];
  getTargetPosition?: (d: Flow) => [number, number];
  getStaggering?: (d: Flow, info: AccessorObjectInfo) => number;
  getPickable?: (d: Flow, { index }: { index: number }) => number; // >= 1.0 -> true
  getColor?: (d: Flow) => RGBA;
  getThickness?: (d: Flow) => number;
  getEndpointOffsets?: (d: Flow) => [number, number];
}

const DEFAULT_COLOR: RGBA = [0, 132, 193, 255];

export default class AnimatedFlowLinesLayer extends Layer {
  static defaultProps = {
    currentTime: 0,
    getSourcePosition: { type: 'accessor', value: (d: Flow) => d.sourcePosition },
    getTargetPosition: { type: 'accessor', value: (d: Flow) => d.targetPosition },
    getPickable: { type: 'accessor', value: (d: Flow) => 1.0 },
    getStaggering: { type: 'accessor', value: (d: Flow, { index }: { index: number }) => Math.random() },
    getColor: { type: 'accessor', value: DEFAULT_COLOR },
    getThickness: { type: 'accessor', value: 1 },
    thicknessUnit: 15 * 2,
    parameters: {
      depthTest: false,
    },
  };

  constructor(props: Props) {
    const overrideProps = null;
    super(props, overrideProps);
  }

  getShaders() {
    return { vs: VertexShader, fs: FragmentShader, modules: ['project32', 'picking'] };
  }

  draw({ uniforms }: any) {
    const { currentTime, thicknessUnit } = this.props;
    this.state.model
      .setUniforms({
        ...uniforms,
        thicknessUnit: thicknessUnit! * 3,
        currentTime,
      })
      .draw();
  }

  initializeState() {
    const { gl } = this.context;
    this.setState({ model: this.createModel(gl) });

    const attributeManager = this.getAttributeManager();

    /* eslint-disable max-len */
    attributeManager.addInstanced({
      instanceSourcePositions: {
        size: 3,
        transition: true,
        accessor: 'getSourcePosition',
      },
      instanceTargetPositions: {
        size: 3,
        transition: true,
        accessor: 'getTargetPosition',
      },
      instanceColors: {
        size: 4,
        type: UNSIGNED_BYTE,
        transition: true,
        accessor: 'getColor',
        defaultValue: [0, 0, 0, 255],
      },
      instanceWidths: {
        size: 1,
        transition: true,
        accessor: 'getThickness',
        defaultValue: 1,
      },
      instanceStaggering: {
        accessor: 'getStaggering',
        size: 1,
        transition: false,
      },
      instancePickable: {
        accessor: 'getPickable',
        size: 1,
        transition: false,
      },
    });
    /* eslint-enable max-len */
  }

  createModel(gl: WebGLRenderingContext) {
    /*
     *  (0, -1)-------------_(1, -1)
     *       |          _,-"  |
     *       o      _,-"      o
     *       |  _,-"          |
     *   (0, 1)"-------------(1, 1)
     */
    const positions = [0, -1, 0, 0, 1, 0, 1, -1, 0, 1, 1, 0];

    return new Model(
      gl,
      Object.assign({}, this.getShaders(), {
        id: this.props.id,
        geometry: new Geometry({
          drawMode: TRIANGLE_STRIP,
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
