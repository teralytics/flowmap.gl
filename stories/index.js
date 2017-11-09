import React from 'react';

import { storiesOf } from '@storybook/react';

import Example from './Example'


storiesOf('FlowMapLayer', module)
  .add('simple', () =>
    <Example />
  )
