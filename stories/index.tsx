import { storiesOf } from '@storybook/react';
import { FeatureCollection, GeometryObject } from 'geojson';
import * as React from 'react';
import FlowMap, { Flow, LocationProperties } from './FlowMap';

// tslint:disable:no-var-requires
const flows16: Flow[] = require('./data/flows-2015.json');
const flows15: Flow[] = require('./data/flows-2016.json');
const flowsDiff1516: Flow[] = require('./data/flows-diff-2015-2016.json');
const locationsData: FeatureCollection<GeometryObject, LocationProperties> = require('./data/locations.json');

storiesOf('Swiss cantons migration', module)
  .add('2015', () => <FlowMap fp64={false} locations={locationsData} flows={flows15} />)
  .add('2016', () => <FlowMap fp64={false} locations={locationsData} flows={flows16} />)
  .add('diff 2015 to 2016', () => <FlowMap fp64={false} locations={locationsData} flows={flowsDiff1516} diff={true} />);
