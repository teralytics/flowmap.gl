import { storiesOf } from '@storybook/react';
import { FeatureCollection, GeometryObject } from 'geojson';
import * as React from 'react';
import FlowMap, { Flow, LocationProperties } from './FlowMap';

// tslint:disable-next-line:no-var-requires
const flowsData: Flow[] = require('./data/flows-2016.json');

// tslint:disable-next-line:no-var-requires
const locationsData: FeatureCollection<GeometryObject, LocationProperties> = require('./data/locations.json');

storiesOf('Swiss cantons migration', module)
  .add('fp32', () => <FlowMap fp64={false} locations={locationsData} flows={flowsData} />)
  .add('fp64', () => <FlowMap fp64={true} locations={locationsData} flows={flowsData} />);
