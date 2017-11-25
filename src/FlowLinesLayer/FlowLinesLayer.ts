import { Attribute, DrawParams, Layer, LayerProps, LayerState, PickingInfo, ShaderCache, Shaders } from 'deck.gl';
import { Geometry, GL, Model } from 'luma.gl';
import { fp64ify, RGBA } from '../utils';
import FragmentShader from './FlowLinesLayerFragment';
import VertexShader from './FlowLinesLayerVertex';

export interface FlowLineData {
  sourcePosition: [number, number];
  targetPosition: [number, number];
  color: RGBA;
  thickness: number;
}

// tslint:disable-next-line:no-any
export type Data = FlowLineData | any;

export interface Props extends LayerProps<Data> {
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

class FlowLinesLayer extends Layer<Data, PickingInfo<Data>, Props, LayerState, Context> {
  static layerName: string = 'FlowLinesLayer';
  static defaultProps: Partial<Props> = {
    getSourcePosition: d => d.sourcePosition,
    getTargetPosition: d => d.targetPosition,
    getColor: d => d.color,
    getThickness: d => d.thickness,
    drawBorder: false,
  };

  getShaders(): Shaders {
    return {
      vs: VertexShader,
      fs: FragmentShader,
      modules: ['project64'],
      shaderCache: this.context.shaderCache,
    };
  }

  initializeState() {
    const { gl } = this.context;
    this.setState({ model: this.createModel(gl) });

    const { attributeManager } = this.state;
    attributeManager.addInstanced({
      instanceSourcePositionsFP64: {
        size: 4,
        update: this.calculateInstanceSourcePositions,
      },
      instanceTargetPositionsFP64: {
        size: 4,
        update: this.calculateInstanceTargetPositions,
      },
      instanceThickness: {
        size: 1,
        update: this.calculateInstanceThickness,
      },
      instanceEndpointOffsets: {
        size: 2,
        update: this.calculateInstanceEndpointOffsets,
      },
      instanceColors: {
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
      [value[i + 0], value[i + 1]] = fp64ify(sourcePosition[0]);
      [value[i + 2], value[i + 3]] = fp64ify(sourcePosition[1]);
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
      [value[i + 0], value[i + 1]] = fp64ify(targetPosition[0]);
      [value[i + 2], value[i + 3]] = fp64ify(targetPosition[1]);
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
