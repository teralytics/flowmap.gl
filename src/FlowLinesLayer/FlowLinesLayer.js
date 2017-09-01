import { Layer } from 'deck.gl'
import { GL, Model, Geometry } from 'luma.gl'
import { fp64ify } from 'deck.gl/dist/lib/utils/fp64' // TODO: should be exported by deck.gl
import VertexShader from './flow-line-layer-vertex.glsl'
import FragmentShader from './flow-line-layer-fragment.glsl'

const DEFAULT_COLOR = [0, 132, 193, 255]
const DEFAULT_BORDER_COLOR = [0.85, 0.85, 0.85, 0.95]

const defaultGetSourcePosition = x => x.sourcePosition
const defaultGetTargetPosition = x => x.targetPosition
const defaultGetColor = x => x.color || DEFAULT_COLOR
const defaultGetBorderColor = x => DEFAULT_BORDER_COLOR
const defaultGetThickness = x => x.thickness
const defaultGetEndpointOffsets = x => [0, 0]
const defaultDrawBorder = false

export default class FlowLinesLayer extends Layer {
  static layerName = 'FlowLinesLayer'

  /**
   * @class
   * @param {object} opts
   */
  constructor(
    {
      getSourcePosition = defaultGetSourcePosition,
      getTargetPosition = defaultGetTargetPosition,
      getEndpointOffsets = defaultGetEndpointOffsets,
      getColor = defaultGetColor,
      getBorderColor = defaultGetBorderColor,
      getThickness = defaultGetThickness,
      drawBorder = defaultDrawBorder,
      ...opts
    } = {}
  ) {
    super({
      getSourcePosition,
      getTargetPosition,
      getEndpointOffsets,
      getColor,
      getBorderColor,
      getThickness,
      drawBorder,
      ...opts,
    })
  }

  getShaders(id) {
    const { shaderCache } = this.context
    return {
      vs: VertexShader,
      fs: FragmentShader,
      modules: ['project64'],
      shaderCache,
    }
  }

  initializeState() {
    const { gl } = this.context
    this.setState({ model: this.createModel(gl) })

    const { attributeManager } = this.state
    attributeManager.add({
      instanceSourcePositionsFP64: {
        size: 4,
        update: this.calculateInstanceSourcePositions,
        instanced: 1,
      },
      instanceTargetPositionsFP64: {
        size: 4,
        update: this.calculateInstanceTargetPositions,
        instanced: 1,
      },
      instanceThickness: {
        size: 1,
        update: this.calculateInstanceThickness,
        instanced: 1,
      },
      instanceEndpointOffsets: {
        size: 2,
        update: this.calculateInstanceEndpointOffsets,
        instanced: 1,
      },
      instanceColors: {
        size: 4,
        type: GL.UNSIGNED_BYTE,
        update: this.calculateInstanceColors,
        instanced: 1,
      },
    })
  }

  draw({ uniforms }) {
    const { gl } = this.context
    const { getBorderColor } = this.props
    gl.lineWidth(1)
    this.state.model.render({
      ...uniforms,
      borderColor: getBorderColor(),
      thicknessUnit: 16,
      gap: 0.75,
    })
  }

  createModel(gl) {
    let positions = [],
      pixelOffsets = []

    const { drawBorder } = this.props
    if (drawBorder) {
      // source_target_mix, perpendicular_offset_in_thickness_units, direction_of_travel_offset_in_thickness_units
      // prettier-ignore
      positions = positions.concat([
          // Border
          0, 0, 0,
          0, 1, 0,
          1, 0, 0,

          0, 1,  0,
          1, 0, -3,
          1, 1, -3,

          1, 0,  0,
          1, 2, -3,
          1, 0, -3,
        ]
      )

      const t = 1 // Border thickness
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

        -t, 3*t, 1,
        2*t, -t, 1,
        -t, -t, 1,

      ])
    }

    // prettier-ignore
    positions = positions.concat([
      // Fill
      0, 0, 0,
      0, 1, 0,
      1, 0, 0,

      0, 1,  0,
      1, 0, -3,
      1, 1, -3,

      1, 0,  0,
      1, 2, -3,
      1, 0, -3
    ])

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
      0, 0, 0
    ])

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
    })
  }

  calculateInstanceSourcePositions(attribute) {
    const { data, getSourcePosition } = this.props
    const { value, size } = attribute
    let i = 0
    for (const object of data) {
      const sourcePosition = getSourcePosition(object)
      {
        ;[value[i + 0], value[i + 1]] = fp64ify(sourcePosition[0]) // keep semicolon!
        ;[value[i + 2], value[i + 3]] = fp64ify(sourcePosition[1])
      }
      i += size
    }
  }

  calculateInstanceTargetPositions(attribute) {
    const { data, getTargetPosition } = this.props
    const { value, size } = attribute
    let i = 0
    for (const object of data) {
      const targetPosition = getTargetPosition(object)
      {
        ;[value[i + 0], value[i + 1]] = fp64ify(targetPosition[0])
        ;[value[i + 2], value[i + 3]] = fp64ify(targetPosition[1])
      }
      i += size
    }
  }

  calculateInstanceColors(attribute) {
    const { data, getColor } = this.props
    const { value, size } = attribute
    let i = 0
    for (const object of data) {
      const color = getColor(object)
      value[i + 0] = color[0]
      value[i + 1] = color[1]
      value[i + 2] = color[2]
      value[i + 3] = isNaN(color[3]) ? DEFAULT_COLOR[3] : color[3]
      i += size
    }
  }

  calculateInstanceThickness(attribute) {
    const { data, getThickness } = this.props
    const { value, size } = attribute
    let i = 0
    for (const object of data) {
      const thickness = getThickness(object)
      value[i] = thickness
      i += size
    }
  }

  calculateInstanceEndpointOffsets(attribute) {
    const { data, getEndpointOffsets } = this.props
    const { value, size } = attribute
    let i = 0
    for (const object of data) {
      const [start, end] = getEndpointOffsets(object)
      value[i + 0] = start
      value[i + 1] = end
      i += size
    }
  }
}
