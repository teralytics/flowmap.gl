require('mapbox-gl/dist/mapbox-gl.css');

import { configure } from '@storybook/react';

function loadStories() {
  require('../stories/index');
}

configure(loadStories, module);

