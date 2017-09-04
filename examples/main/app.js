import React, {Component} from 'react'
import {render} from 'react-dom'
import MapGL from 'react-map-gl'
import DeckGL, {LineLayer} from 'deck.gl'
import FlowMapLayer from 'flow-map.gl'

const MAPBOX_TOKEN = process.env.MapboxAccessToken // eslint-disable-line

class Root extends Component {

  constructor(props) {
    super(props)
    this.state = {
      viewport: {
        latitude: 37.785164,
        longitude: -122.41669,
        zoom: 14,
        // bearing: -20.55991,
        // pitch: 60,
      },
      width: 500,
      height: 500
    }
  }

  render() {
    const {viewport, width, height} = this.state

    return (
      <MapGL
        {...viewport}
        width={width}
        height={height}
        mapboxApiAccessToken={MAPBOX_TOKEN}>
        <DeckGL
          {...viewport}
          width={width}
          height={height}
          debug
          layers={[
            new FlowMapLayer({
              baseColor: 'steelblue',
              flows: [
                {
                  origin:{code:1,location:[-122.41669, 37.7853]},
                  dest:{code:2,location:[-122.41669, 37.781]},
                  magnitude:5
                },
                {
                  origin:{code:2,location:[-122.41669, 37.781]},
                  dest:{code:1,location:[-122.41669, 37.7853]},
                  magnitude:10
                },
                {
                  origin:{code:3,location:[-122.415, 37.784]},
                  dest:{code:1,location:[-122.41669, 37.7853]},
                  magnitude:3
                },
              ],
              zones: [
                // {"type":"Feature","id":"DT13",
                //   "geometry":{"type":"Polygon","coordinates":
                //     [[[103.8520033287069,1.2821811107775487],[103.85190002691171,1.2820228786810506],[103.85156673244043,1.282402635712646],[103.85109115436447,1.2826222426829372],[103.85040117633622,1.2826497335118237],[103.84965467468419,1.283794119179426],[103.84955234743424,1.283907918424584],[103.84994752552811,1.2852086182238784],[103.84953870380092,1.2855749495018316],[103.85012538003397,1.2857929581681178],[103.85081584533484,1.2862996205377126],[103.85170657968203,1.286167280966096],[103.85235611408292,1.2865058017543616],[103.85272790309108,1.285750443281584],[103.85260608493637,1.2853713255715906],[103.85300028848499,1.28523451074876],[103.85321176480157,1.2849078174101316],[103.8526197285697,1.2832912927394433],[103.8520033287069,1.2821811107775487]]]},
                //   "properties":{"code":"DT13","name":"DT13","centroid":[103.8513647469372,1.2844390998251523],"totalOut":2911,"totalIn":1007,"canLookInside":false}}
              ],

              // highlightedZone,
              // highlightedFlow,
              // showTotals,
              // onHover: this.handleFlowMapHover,
              // onClick: this.handleFlowMapClick,
            })
          ]} />
      </MapGL>
    )
  }
}

render(<Root />, document.body.appendChild(document.createElement('div')))