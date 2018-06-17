# flowmap.gl

Flow map drawing layer for [deck.gl](http://uber.github.io/deck.gl).

Check out [live examples](https://teralytics.github.io/flowmap.gl/index.html). 

<img src="./doc/ch.png" width="500" />

## Usage

Here's a usage example:
  
    import DeckGL from 'deck.gl';
    import MapGL from 'react-map-gl';
    import FlowMapLayer from 'flowmap.gl';

    const colors = {
      flows: {
        max: '#137CBD',
      },
      locationAreas: {
        outline: 'rgba(92,112,128,0.5)',
        normal: 'rgba(187,187,187,0.5)',
        selected: 'rgba(217,130,43,0.5)',
      },
    };

    const flowMapLayer = new FlowMapLayer({
      id: 'flow-map-layer',
      colors,
      locations: [...],   // array of GeoJSON features of location areas
      flows: [...],       // array of Flow objects
      getLocationId: l => l.id,
      getLocationCentroid: l => l.properties.centroid,
      getFlowOriginId: f => f.origin,
      getFlowDestId: f => f.dest,
      getFlowMagnitude: f => f.magnitude,
      showTotals: true,
      showLocationAreas: true,
      locationCircleSize: 3,
      showLocationAreas: true,
      getFlowMagnitude: f => f.count,
      varyFlowColorByMagnitude: true,
      showTotals: true,
    });
  
    return (
      <MapGL {...viewport} width={width} height={height} mapboxApiAccessToken={mapboxAccessToken}>
        <DeckGL {...viewport} width={width} height={height} layers={[flowMapLayer]} />
      </MapGL>
    );

The full list of supported props:
  
    interface Props {
      id: string;
      colors: Colors | DiffColors;
      locations: Locations;
      flows: Flow[];
      fp64?: boolean;
      onClick?: PickingHandler<FlowLayerPickingInfo>;
      onHover?: PickingHandler<FlowLayerPickingInfo>;
      getLocationId?: LocationAccessor<string>;
      getLocationCentroid?: LocationAccessor<[number, number]>;
      getLocationTotalIn?: LocationAccessor<number>;
      getLocationTotalOut?: LocationAccessor<number>;
      getFlowOriginId?: FlowAccessor<string>;
      getFlowDestId?: FlowAccessor<string>;
      getFlowMagnitude?: FlowAccessor<number>;
      showTotals?: boolean;
      locationCircleSize?: number;
      showLocationAreas?: boolean;
      varyFlowColorByMagnitude?: boolean;
      selectedLocationIds?: string[];
      highlightedLocationId?: string;
      highlightedFlow?: Flow;
      visible?: boolean;
      opacity?: number;
      pickable?: boolean;
      fp64?: boolean;
      updateTriggers?: UpdateTriggers;
    }


Here's the code for the [complete static example](./examples/StaticExample.tsx)
and a more complex [interactive example](./examples/InteractiveExample.tsx).

## Developing

Create an `.env` file in the project root 
containing one line: 

    MapboxAccessToken=<your-mapbox-access-token>

Then, run:

    npm install
    npm start
    open http://localhost:6006 to open storybook

## Acknowledgements

Many thanks to [Philippe Voinov](https://github.com/tehwalris) 
for his help with the first version of the FlowLinesLayer. 
