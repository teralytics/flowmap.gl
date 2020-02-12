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
import {TRIANGLES, UNSIGNED_BYTE} from '@luma.gl/constants';
import {Geometry, Model} from '@luma.gl/core';
import {RGBA} from '../colors';
import {Flow} from '../types';
import FragmentShader from './FlowLinesLayerFragment.glsl';
import VertexShader from './FlowLinesLayerVertex.glsl';
import {LayerProps} from "../LayerProps";

export interface Props extends LayerProps {
  id: string;
  opacity?: number;
  pickable?: boolean;
  updateTriggers?: { [key: string]: {} };
  data: Flow[];
  drawOutline: boolean;
  outlineColor?: RGBA;
  outlineThickness?: number;
  thicknessUnit?: number;
  getSourcePosition?: (d: Flow) => [number, number];
  getTargetPosition?: (d: Flow) => [number, number];
  getColor?: (d: Flow) => RGBA;
  getThickness?: (d: Flow) => number;
  getPickable?: (d: Flow, { index }: { index: number }) => number; // >= 1.0 -> true
  getEndpointOffsets?: (d: Flow) => [number, number];
}

const DEFAULT_COLOR: RGBA = [0, 132, 193, 255];
const INNER_SIDE_OUTLINE_THICKNESS = 1;

class FlowLinesLayer extends Layer {
  static layerName: string = 'FlowLinesLayer';
  static defaultProps = {
    getSourcePosition: { type: 'accessor', value: (d: Flow) => d.sourcePosition },
    getTargetPosition: { type: 'accessor', value: (d: Flow) => d.targetPosition },
    getColor: { type: 'accessor', value: DEFAULT_COLOR },
    getThickness: { type: 'accessor', value: (d: Flow) => d.thickness }, // 0..0.5
    getPickable: { type: 'accessor', value: (d: Flow) => 1.0 },
    drawOutline: true,
    thicknessUnit: 10,
    outlineThickness: 1,
    outlineColor: [255, 255, 255, 255],
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
      shaderCache: this.context.shaderCache,
    });
  }

  initializeState() {
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
      instancePickable: {
        accessor: 'getPickable',
        size: 1,
        transition: false,
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
    const { gl } = this.context;
    const { outlineColor, thicknessUnit } = this.props;
    gl.lineWidth(1);
    this.state.model
      .setUniforms({
        ...uniforms,
        outlineColor: outlineColor!.map((x: number) => x / 255),
        thicknessUnit: thicknessUnit! * 2.0,
        gap: 0.5,
      })
      .draw();
  }

  _getModel(gl: WebGLRenderingContext) {
    let positions: number[] = [];
    let pixelOffsets: number[] = [];

    const { drawOutline, outlineThickness } = this.props;
    if (drawOutline) {
      // source_target_mix, perpendicular_offset_in_thickness_units, direction_of_travel_offset_in_thickness_units
      // prettier-ignore
      positions = positions.concat([
          // Outline
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

      const tout = outlineThickness!;
      const tin = INNER_SIDE_OUTLINE_THICKNESS; // the outline shouldn't cover the opposite arrow
      // perpendicular_offset_in_pixels, direction_of_travel_offset_in_pixels, fill_outline_color_mix
      // prettier-ignore
      pixelOffsets = pixelOffsets.concat([
        // Outline
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
