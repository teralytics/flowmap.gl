import { storiesOf } from '@storybook/react';
import * as React from 'react';
import Example from './Example';

storiesOf('FlowMapLayer', module)
  .add('fp32', () => <Example fp64={false} />)
  .add('fp64', () => <Example fp64={true} />);
