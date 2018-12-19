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

import { Attribute, DrawParams, Layer, LayerProps, LayerState, ShaderCache, Shaders } from 'deck.gl';
import { fp64, Geometry, Model } from 'luma.gl';
import { TRIANGLES, UNSIGNED_BYTE } from 'luma.gl/constants';
import { RGBA } from '../types';
import FragmentShader from './FlowLinesLayerFragment.glsl';
import VertexShader from './FlowLinesLayerVertex.glsl';
import VertexShader64 from './FlowLinesLayerVertex64.glsl';

export interface FlowLineData {
  sourcePosition: [number, number];
  targetPosition: [number, number];
  color: RGBA;
  thickness: number;
}

// tslint:disable-next-line:no-any
export type Data = FlowLineData | any;

export interface Props extends LayerProps {
  data: Data[];
  drawBorder: boolean;
  borderColor?: RGBA;
  borderThickness?: number;
  getSourcePosition?: (d: Data) => [number, number];
  getTargetPosition?: (d: Data) => [number, number];
  getColor?: (d: Data) => RGBA;
  getThickness?: (d: Data) => number;
  getEndpointOffsets?: (d: Data) => [number, number];
}

export interface Context {
  gl: WebGLRenderingContext;
  shaderCache: ShaderCache;
}

const { fp64ify } = fp64;

const DEFAULT_COLOR: RGBA = [0, 132, 193, 255];
const DEFAULT_BORDER_COLOR: RGBA = [0.85, 0.85, 0.85, 0.95];
const DEFAULT_ENDPOINT_OFFSETS = [0, 0];

class FlowLinesLayer extends Layer<Props, LayerState, Context> {
  static layerName: string = 'FlowLinesLayer';
  static defaultProps: Partial<Props> = {
    getSourcePosition: d => d.sourcePosition,
    getTargetPosition: d => d.targetPosition,
    getColor: d => d.color,
    getThickness: d => d.thickness,
    drawBorder: false,
  };

  getShaders(): Shaders {
    return this.use64bitProjection()
      ? {
          vs: VertexShader64,
          fs: FragmentShader,
          modules: ['project64', 'picking'],
          shaderCache: this.context.shaderCache,
        }
      : {
          vs: VertexShader,
          fs: FragmentShader,
          modules: ['picking'],
          shaderCache: this.context.shaderCache,
        };
  }

  initializeState() {
    const { gl } = this.context;
    this.setState({ model: this.createModel(gl) });

    const { attributeManager } = this.state;

    if (this.use64bitProjection()) {
      attributeManager.addInstanced({
        instanceSourceTargetPositions64xyLow: {
          size: 4,
          accessor: ['getSourcePosition', 'getTargetPosition'],
          update: this.calculateInstanceSourceTargetPositions64xyLow,
        },
      });
    }
    attributeManager.addInstanced({
      instanceSourcePositions: {
        accessor: 'getSourcePosition',
        size: 3,
        update: this.calculateInstanceSourcePositions,
      },
      instanceTargetPositions: {
        accessor: 'getTargetPosition',
        size: 3,
        update: this.calculateInstanceTargetPositions,
      },
      instanceThickness: {
        accessor: 'getThickness',
        size: 1,
        update: this.calculateInstanceThickness,
      },
      instanceEndpointOffsets: {
        accessor: 'getEndpointOffsets',
        size: 2,
        update: this.calculateInstanceEndpointOffsets,
      },
      instanceColors: {
        accessor: 'getColor',
        size: 4,
        type: UNSIGNED_BYTE,
        update: this.calculateInstanceColors,
      },
    });
  }

  draw({ uniforms }: DrawParams) {
    const { gl } = this.context;
    const { borderColor } = this.props;
    gl.lineWidth(1);
    this.state.model.render({
      ...uniforms,
      borderColor: borderColor || DEFAULT_BORDER_COLOR,
      thicknessUnit: 16,
      gap: 0.75,
    });
  }

  createModel(gl: WebGLRenderingContext) {
    let positions: number[] = [];
    let pixelOffsets: number[] = [];

    const { drawBorder } = this.props;
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

      const t = this.props.borderThickness || 1; // Border thickness
      // perpendicular_offset_in_pixels, direction_of_travel_offset_in_pixels, fill_border_color_mix
      // prettier-ignore
      pixelOffsets = pixelOffsets.concat([
        // Border
        -t, -t, 1,
        t, -t, 1,
        -t, t, 1,

        t, -t, 1,
        -t, 0, 1,
        t, 0, 1,

        -t, 3 * t, 1,
        2 * t, -t, 1,
        -t, -t, 1,

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

  calculateInstanceSourcePositions(attribute: Attribute) {
    const { data, getSourcePosition } = this.props;
    const { value, size } = attribute;
    let i = 0;
    for (const object of data) {
      const sourcePosition = getSourcePosition!(object);
      value[i + 0] = sourcePosition[0];
      value[i + 1] = sourcePosition[1];
      i += size;
    }
  }

  calculateInstanceTargetPositions(attribute: Attribute) {
    const { data, getTargetPosition } = this.props;
    const { value, size } = attribute;
    let i = 0;
    for (const object of data) {
      const targetPosition = getTargetPosition!(object);
      value[i + 0] = targetPosition[0];
      value[i + 1] = targetPosition[1];
      i += size;
    }
  }

  calculateInstanceSourceTargetPositions64xyLow(attribute: Attribute) {
    const { data, getSourcePosition, getTargetPosition } = this.props;
    const { value, size } = attribute;
    let i = 0;
    for (const object of data) {
      const sourcePosition = getSourcePosition!(object);
      const targetPosition = getTargetPosition!(object);
      value[i + 0] = fp64ify(sourcePosition[0])[1];
      value[i + 1] = fp64ify(sourcePosition[1])[1];
      value[i + 2] = fp64ify(targetPosition[0])[1];
      value[i + 3] = fp64ify(targetPosition[1])[1];
      i += size;
    }
  }

  calculateInstanceColors(attribute: Attribute) {
    const { data, getColor } = this.props;
    const { value, size } = attribute;
    let i = 0;
    for (const object of data) {
      const color = getColor ? getColor(object) : DEFAULT_COLOR;
      value[i + 0] = color[0];
      value[i + 1] = color[1];
      value[i + 2] = color[2];
      value[i + 3] = isNaN(color[3]) ? DEFAULT_COLOR[3] : color[3];
      i += size;
    }
  }

  calculateInstanceThickness(attribute: Attribute) {
    const { data, getThickness } = this.props;
    const { value, size } = attribute;
    let i = 0;
    for (const object of data) {
      value[i] = getThickness!(object);
      i += size;
    }
  }

  calculateInstanceEndpointOffsets(attribute: Attribute) {
    const { data, getEndpointOffsets } = this.props;
    const { value, size } = attribute;
    let i = 0;
    for (const object of data) {
      const [start, end] = getEndpointOffsets ? getEndpointOffsets(object) : DEFAULT_ENDPOINT_OFFSETS;
      value[i + 0] = start;
      value[i + 1] = end;
      i += size;
    }
  }
}

export default FlowLinesLayer;
