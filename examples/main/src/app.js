import React, {Component} from 'react'
import {render} from 'react-dom'
import MapGL from 'react-map-gl'
import DeckGL from 'deck.gl'
import FlowMapLayer from 'flow-map.gl'
import geoViewport from '@mapbox/geo-viewport'

const MAPBOX_TOKEN = process.env.MapboxAccessToken // eslint-disable-line

const width = window.innerWidth
const height = window.innerHeight

const bbox = [5.9559111595,45.8179931641,10.4920501709,47.808380127]


const getLocationID = l => l.properties.abbr
const getLocationCentroid = l => l.properties.centroid
const getLocationGeometryFeature = l => l

const getFlowOriginID = f => f.origin
const getFlowDestID = f => f.dest
const getFlowMagnitude = f => f.magnitude

  
class Root extends Component {

  constructor(props) {
    super(props)
    const { center: [longitude, latitude], zoom } =
      geoViewport.viewport(
        bbox,
        [width, height],
        undefined, undefined, 512
      )

    this.state = {
      viewport: {
        width,
        height,
        longitude,
        latitude,
        zoom,
      },
      locations: null,
      highlightedLocation: null,
      highlightedFlow: null,
    }

    fetch('./data/locations.json')
      .then(resp => resp.json())
      .then(geoJson => this.setState({locations: geoJson.features}))

    fetch('./data/flows.json')
      .then(resp => resp.json())
      .then(flows => this.setState({flows}))
  }


  getFlowMapLayer() {
    const {
      locations,
      flows,
      highlightedLocation,
      highlightedFlow,
    } = this.state
    if (!locations || !flows) return null

    return new FlowMapLayer({
      baseColor: '#0084c1',

      locations,
      getLocationID,
      getLocationCentroid,
      getLocationGeometryFeature,

      flows,
      getFlowOriginID,
      getFlowDestID,
      getFlowMagnitude,

      showLocationOutlines: false,

      highlightedLocation,
      highlightedFlow,

      onHover: this.handleFlowMapHover,
      onClick: this.handleFlowMapClick,
    })
  }

  handleFlowMapHover = ({ kind, object }) => {
    switch (kind) {
      case 'flow':
        this.setState({
          highlightedFlow: object
        })
        break

      case 'location':
        this.setState({
          highlightedLocation: object ? getLocationID(object) : null
        })
        break

      default:
        this.setState({
          highlightedFlow: null,
          highlightedLocation: null,
        })

    }
  }

  handleFlowMapClick = (params) => {
    console.log('handleFlowMapClick', params)
  }

  handleChangeViewport = (v) => {
    this.setState({ viewport: { ...this.state.viewport, ...v } })
  }

  render() {
    const {viewport} = this.state
    return (
      <MapGL
        {...viewport}
        onViewportChange={this.handleChangeViewport}
        mapboxApiAccessToken={MAPBOX_TOKEN}>
        <DeckGL
          {...viewport}
          debug
          layers={[
            this.getFlowMapLayer()
          ]} />
      </MapGL>
    )
  }
}

render(<Root />, document.body.appendChild(document.createElement('div')))