import React, {Component} from 'react'
import {render} from 'react-dom'
import MapGL from 'react-map-gl'
import DeckGL from 'deck.gl'
import FlowMapLayer from 'flow-map.gl'
import geoViewport from '@mapbox/geo-viewport'
import _ from 'lodash'

const MAPBOX_TOKEN = process.env.MapboxAccessToken // eslint-disable-line

const width = window.innerWidth
const height = window.innerHeight

const ESC_KEY = 27

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
      highlightedLocationID: null,
      highlightedFlow: null,
    }

    fetch('./data/locations.json')
      .then(resp => resp.json())
      .then(geoJson => this.setState({locations: geoJson.features}))

    fetch('./data/flows.json')
      .then(resp => resp.json())
      .then(flows => this.setState({flows: flows.filter((d,i)=> i%6)}))
  }


  getFlowMapLayer() {
    const {
      locations,
      flows,
      highlightedLocationID,
      selectedLocationID,
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

      selectedLocationID,
      highlightedLocationID,
      highlightedFlow,

      onHover: this.handleFlowMapHover,
      onClick: this.handleFlowMapClick,
    })
  }

  highlight = ({ highlightedLocationID, highlightedFlow }) => {
    this.setState({
      highlightedLocationID,
      highlightedFlow
    })
    this.highlightDebounced.cancel()
  }

  highlightDebounced = _.debounce(this.highlight, 100)


  handleFlowMapHover = ({ kind, object }) => {
    switch (kind) {
      case 'flow':
        this.highlight({
          highlightedFlow: object,
          highlightedLocationID: null,
        })
        break

      case 'location':
        this.highlight({
          highlightedFlow: null,
          highlightedLocationID: object ? getLocationID(object) : null
        })
        break

      default:
        this.highlightDebounced({
          highlightedFlow: null,
          highlightedLocationID: null,
        })
    }
  }

  handleFlowMapClick = ({ kind, object }) => {
    switch (kind) {
      case 'location': {
        const { selectedLocationID } = this.state
        const nextSelectedID = object ? getLocationID(object) : null
        this.setState({
          selectedLocationID: nextSelectedID === selectedLocationID ? null : nextSelectedID
        })
        break
      }
    }
  }

  handleChangeViewport = (v) => {
    this.setState({ viewport: { ...this.state.viewport, ...v } })
  }

  handleKeyDown = (evt: Event) => {
    if (evt instanceof KeyboardEvent) {
      if (evt.keyCode === ESC_KEY) {
        this.setState({
          selectedLocationID: null,
        })
      }
    }
  }

  componentWillMount() {
    document.addEventListener('keydown', this.handleKeyDown)
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.handleKeyDown)
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
          layers={[
            this.getFlowMapLayer()
          ]} />
      </MapGL>
    )
  }
}

render(<Root />, document.body.appendChild(document.createElement('div')))