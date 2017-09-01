// Based on scatter-plot-layer from deck.gl

import { Layer, COORDINATE_SYSTEM } from 'deck.gl'
import { get } from 'deck.gl/dist/lib/utils'
import { GL, Model, Geometry } from 'luma.gl'
import { fp64ify } from 'deck.gl/dist/lib/utils/fp64'
import VertexShader64 from './circles-layer-64-vertex.glsl'
import FragmentShader from './circles-layer-fragment.glsl'

const DEFAULT_COLOR = [0, 0, 0, 255]

const defaultProps = {
  getPosition: x => x.position,
  getRadius: x => x.radius || 30,
  getColor: x => x.color || DEFAULT_COLOR,
  radiusScale: 30,
  outline: false,
  strokeWidth: 1,
  fp64: true,
}

export default class CirclesLayer extends Layer {
  getShaders(id) {
    const { shaderCache } = this.context
    return {
      vs: VertexShader64,
      fs: FragmentShader,
      modules: ['project64'],
      shaderCache,
    }
  }

  initializeState() {
    const { gl } = this.context
    this.setState({ model: this._getModel(gl) })

    this.state.attributeManager.addInstanced({
      instancePositions: {
        size: 3,
        accessor: 'getPosition',
        update: this.calculateInstancePositions,
      },
      instanceRadius: {
        size: 1,
        accessor: 'getRadius',
        defaultValue: 1,
        update: this.calculateInstanceRadius,
      },
      instanceColors: {
        size: 4,
        type: GL.UNSIGNED_BYTE,
        accessor: 'getColor',
        update: this.calculateInstanceColors,
      },
    })
    /* eslint-enable max-len */
  }

  updateAttribute({ props, oldProps, changeFlags }) {
    if (props.fp64 !== oldProps.fp64) {
      const { attributeManager } = this.state
      attributeManager.invalidateAll()

      if (props.fp64 && props.projectionMode === COORDINATE_SYSTEM.LNGLAT) {
        attributeManager.addInstanced({
          instancePositions64xyLow: {
            size: 2,
            accessor: 'getPosition',
            update: this.calculateInstancePositions64xyLow,
          },
        })
      } else {
        attributeManager.remove(['instancePositions64xyLow'])
      }
    }
  }

  updateState({ props, oldProps, changeFlags }) {
    super.updateState({ props, oldProps, changeFlags })
    this.updateAttribute({ props, oldProps, changeFlags })
  }

  draw({ uniforms }) {
    const { radiusScale, outline, strokeWidth } = this.props
    this.state.model.render(
      Object.assign({}, uniforms, {
        outline: outline ? 1 : 0,
        strokeWidth,
        radiusScale,
      })
    )
  }

  _getModel(gl) {
    // a square that minimally cover the unit circle
    const positions = [-1, -1, 0, -1, 1, 0, 1, 1, 0, 1, -1, 0]
    return new Model(gl, {
      id: this.props.id,
      ...this.getShaders(),
      geometry: new Geometry({
        drawMode: GL.TRIANGLE_FAN,
        positions: new Float32Array(positions),
      }),
      shaderCache: this.context.shaderCache,
      isInstanced: true,
    })
  }

  calculateInstancePositions(attribute) {
    const { data, getPosition } = this.props
    const { value } = attribute
    let i = 0
    for (const point of data) {
      const position = getPosition(point)
      value[i++] = get(position, 0)
      value[i++] = get(position, 1)
      value[i++] = get(position, 2) || 0
    }
  }

  calculateInstancePositions64xyLow(attribute) {
    const { data, getPosition } = this.props
    const { value } = attribute
    let i = 0
    for (const point of data) {
      const position = getPosition(point)
      value[i++] = fp64ify(get(position, 0))[1]
      value[i++] = fp64ify(get(position, 1))[1]
    }
  }

  calculateInstanceRadius(attribute) {
    const { data, getRadius } = this.props
    const { value } = attribute
    let i = 0
    for (const point of data) {
      const radius = getRadius(point)
      value[i++] = isNaN(radius) ? 1 : radius
    }
  }

  calculateInstanceColors(attribute) {
    const { data, getColor } = this.props
    const { value } = attribute
    let i = 0
    for (const point of data) {
      const color = getColor(point) || DEFAULT_COLOR
      value[i++] = get(color, 0)
      value[i++] = get(color, 1)
      value[i++] = get(color, 2)
      value[i++] = isNaN(get(color, 3)) ? 255 : get(color, 3)
    }
  }
}

CirclesLayer.layerName = 'CirclesLayer'
CirclesLayer.defaultProps = defaultProps
