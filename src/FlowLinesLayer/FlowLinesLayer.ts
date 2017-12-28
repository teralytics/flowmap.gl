import { Attribute, COORDINATE_SYSTEM, DrawParams, Layer, LayerProps, LayerState, ShaderCache, Shaders } from 'deck.gl';
import { Geometry, GL, Model } from 'luma.gl';
import { enable64bitSupport, fp64ify, RGBA } from '../utils';
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
    return enable64bitSupport(this.props)
      ? {
          vs: VertexShader64,
          fs: FragmentShader,
          modules: ['project64'],
          shaderCache: this.context.shaderCache,
        }
      : {
          vs: VertexShader,
          fs: FragmentShader,
          modules: [],
          shaderCache: this.context.shaderCache,
        };
  }

  initializeState() {
    const { gl } = this.context;
    this.setState({ model: this.createModel(gl) });

    const { attributeManager } = this.state;

    if (enable64bitSupport(this.props)) {
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
        type: GL.UNSIGNED_BYTE,
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

      const t = 1; // Border thickness
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
        drawMode: GL.TRIANGLES,
        positions: new Float32Array(positions),
        normals: new Float32Array(pixelOffsets),
      }),
      isInstanced: true,
      shaderCache: this.context.shaderCache,
    });
  }

  calculateInstanceSourcePositions(attribute: Attribute) {
    const { data, getSourcePosition } = this.props;
    if (!getSourcePosition) {
      throw new Error('getSourcePosition must be defined');
    }

    const { value, size } = attribute;
    let i = 0;
    for (const object of data) {
      const sourcePosition = getSourcePosition(object);
      value[i + 0] = sourcePosition[0];
      value[i + 1] = sourcePosition[1];
      value[i + 2] = isNaN(sourcePosition[2]) ? 0 : sourcePosition[2];
      i += size;
    }
  }

  calculateInstanceTargetPositions(attribute: Attribute) {
    const { data, getTargetPosition } = this.props;
    if (!getTargetPosition) {
      throw new Error('getTargetPosition must be defined');
    }

    const { value, size } = attribute;
    let i = 0;
    for (const object of data) {
      const targetPosition = getTargetPosition(object);
      value[i + 0] = targetPosition[0];
      value[i + 1] = targetPosition[1];
      value[i + 2] = isNaN(targetPosition[2]) ? 0 : targetPosition[2];
      i += size;
    }
  }

  calculateInstanceSourceTargetPositions64xyLow(attribute: Attribute) {
    const { data, getSourcePosition, getTargetPosition } = this.props;
    if (!getSourcePosition) {
      throw new Error('getSourcePosition must be defined');
    }
    if (!getTargetPosition) {
      throw new Error('getTargetPosition must be defined');
    }
    const { value, size } = attribute;
    let i = 0;
    for (const object of data) {
      const sourcePosition = getSourcePosition(object);
      const targetPosition = getTargetPosition(object);
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
    if (!getThickness) {
      throw new Error('getThickness must be defined');
    }

    const { value, size } = attribute;
    let i = 0;
    for (const object of data) {
      value[i] = getThickness(object);
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
