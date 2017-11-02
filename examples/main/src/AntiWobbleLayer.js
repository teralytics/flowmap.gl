import React, { PureComponent } from 'react'

/**
 * This is a workaround for the Chrome wobble issue
 */
export default class AntiWobbleLayer extends PureComponent {

  componentDidMount() {
    this._redraw()
  }

  componentDidUpdate() {
    this._redraw()
  }

  _redraw() {
    const canvas = this.refs.overlay
    const ctx: CanvasRenderingContext2D = canvas.getContext('2d')
    ctx.clearRect(0, 0, this.props.width, this.props.height)
  }

  render() {
    return (
      <canvas
        ref="overlay"
        width={this.props.width}
        height={this.props.height}
        style={{
          width: `${this.props.width}px`,
          height: `${this.props.height}px`,
          position: 'absolute',
          pointerEvents: 'none',
          left: 0,
          top: 0,
        }}
      />
    )
  }
}
