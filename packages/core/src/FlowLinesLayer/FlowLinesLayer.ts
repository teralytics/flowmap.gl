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
import { Geometry, Model } from 'luma.gl';
import { TRIANGLES, UNSIGNED_BYTE } from 'luma.gl/constants';
import { Flow, RGBA } from '../types';
import FragmentShader from './FlowLinesLayerFragment.glsl';
import VertexShader from './FlowLinesLayerVertex.glsl';

export interface Props {
  id: string;
  opacity?: number;
  pickable?: boolean;
  updateTriggers?: { [key: string]: {} };
  data: Flow[];
  drawBorder: boolean;
  borderColor?: RGBA;
  borderThickness?: number;
  getSourcePosition?: (d: Flow) => [number, number];
  getTargetPosition?: (d: Flow) => [number, number];
  getColor?: (d: Flow) => RGBA;
  getThickness?: (d: Flow) => number;
  getEndpointOffsets?: (d: Flow) => [number, number];
}

const DEFAULT_COLOR: RGBA = [0, 132, 193, 255];
const INNER_SIDE_BORDER_THICKNESS = 1;

class FlowLinesLayer extends Layer {
  static layerName: string = 'FlowLinesLayer';
  static defaultProps = {
    getSourcePosition: { type: 'accessor', value: (d: Flow) => d.sourcePosition },
    getTargetPosition: { type: 'accessor', value: (d: Flow) => d.targetPosition },
    getColor: { type: 'accessor', value: DEFAULT_COLOR },
    getThickness: { type: 'accessor', value: (d: Flow) => d.thickness },
    drawBorder: true,
    borderThickness: 1,
    borderColor: [255, 255, 255, 255],
  };

  constructor(props: Props) {
    super(props);
  }

  getShaders() {
    const projectModule = this.use64bitProjection() ? 'project64' : 'project32';
    return {
      vs: VertexShader,
      fs: FragmentShader,
      modules: [projectModule, 'picking'],
      shaderCache: this.context.shaderCache,
    };
  }

  initializeState() {
    const { gl } = this.context;
    this.setState({ model: this.createModel(gl) });

    const { attributeManager } = this.state;

    attributeManager.addInstanced({
      instanceSourcePositions: {
        accessor: 'getSourcePosition',
        size: 3,
        transition: false,
      },
      instanceTargetPositions: {
        accessor: 'getTargetPosition',
        size: 3,
        transition: false,
      },
      instanceThickness: {
        accessor: 'getThickness',
        size: 1,
        transition: false,
      },
      instanceEndpointOffsets: {
        accessor: 'getEndpointOffsets',
        size: 2,
        transition: false,
      },
      instanceColors: {
        accessor: 'getColor',
        size: 4,
        type: UNSIGNED_BYTE,
        transition: false,
      },
    });
  }

  draw(opts: any) {
    const { gl } = this.context;
    const { borderColor } = this.props;
    gl.lineWidth(1);
    this.state.model.draw({
      ...opts,
      uniforms: {
        ...opts.uniforms,
        borderColor: borderColor.map((x: number) => x / 255),
        thicknessUnit: 16,
        gap: 0.75,
      },
    });
  }

  createModel(gl: WebGLRenderingContext) {
    let positions: number[] = [];
    let pixelOffsets: number[] = [];

    const { drawBorder, borderThickness } = this.props;
    if (drawBorder) {
      // source_target_mix, perpendicular_offset_in_thickness_units, direction_of_travel_offset_in_thickness_units
      // prettier-ignore
      positions = positions.concat([
          // Border
          0, 0, 0,
          0, 1, 0,
          1, 0, 0,

          0, 1, 0,
          1, 0, -3,
          1, 1, -3,

          1, 0, 0,
          1, 2, -3,
          1, 0, -3,
        ],
      );

      const tout = borderThickness;
      const tin = INNER_SIDE_BORDER_THICKNESS; // the border shouldn't cover the opposite arrow
      // perpendicular_offset_in_pixels, direction_of_travel_offset_in_pixels, fill_border_color_mix
      // prettier-ignore
      pixelOffsets = pixelOffsets.concat([
        // Border
        -tin, -tout, 1,
        tout, -tout, 1,
        -tin, tout, 1,

        tout, -tout, 1,
        -tin, 0, 1,
        tout, 0, 1,

        -tin, 3 * tout, 1,
        2 * tout, -tout, 1,
        -tin, -tout, 1,

      ]);
    }

    // prettier-ignore
    positions = positions.concat([
      // Fill
      0, 0, 0,
      0, 1, 0,
      1, 0, 0,

      0, 1, 0,
      1, 0, -3,
      1, 1, -3,

      1, 0, 0,
      1, 2, -3,
      1, 0, -3,
    ]);

    // prettier-ignore
    pixelOffsets = pixelOffsets.concat([
      // Fill
      0, 0, 0,
      0, 0, 0,
      0, 0, 0,

      0, 0, 0,
      0, 0, 0,
      0, 0, 0,

      0, 0, 0,
      0, 0, 0,
      0, 0, 0,
    ]);

    return new Model(gl, {
      id: this.props.id,
      ...this.getShaders(),
      geometry: new Geometry({
        drawType: TRIANGLES,
        attributes: {
          positions: new Float32Array(positions),
          normals: new Float32Array(pixelOffsets),
        },
      }),
      isInstanced: true,
      shaderCache: this.context.shaderCache,
    });
  }
}

export default FlowLinesLayer;
