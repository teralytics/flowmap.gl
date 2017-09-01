const resolve = require('path').resolve;
const webpack = require('webpack');

const LIB_DIR = resolve(__dirname, '..');
const SRC_DIR = resolve(LIB_DIR, './src');

// Support for hot reloading changes to the deck.gl library:
const LOCAL_DEV_CONFIG = {
  // suppress warnings about bundle size
  devServer: {
    stats: {
      warnings: false
    }
  },

  devtool: 'source-map',

  resolve: {
    alias: {
      // For importing modules that are not exported at root
      'flow-map.gl/dist': SRC_DIR,
      // Imports the deck.gl library from the src directory in this repo
      'flow-map.gl': SRC_DIR,
      // Important: ensure shared dependencies come from the main node_modules dir
      'deck.gl': resolve(LIB_DIR, './node_modules/deck.gl'),
      'luma.gl': resolve(LIB_DIR, './node_modules/luma.gl'),
      seer: resolve(LIB_DIR, './node_modules/seer'),
      react: resolve(LIB_DIR, './node_modules/react')
    }
  },
  module: {
    rules: [
      {
        // Compile source using buble
        test: /\.js$/,
        loader: 'buble-loader',
        include: [SRC_DIR],
        options: {
          objectAssign: 'Object.assign',
          transforms: {
            dangerousForOf: true,
            modules: false
          }
        }
      },
      {
        // Unfortunately, webpack doesn't import library sourcemaps on its own...
        test: /\.js$/,
        use: ['source-map-loader'],
        enforce: 'pre'
      }
    ]
  },
  // Optional: Enables reading mapbox token from environment variable
  plugins: [
    new webpack.EnvironmentPlugin(['MapboxAccessToken'])
  ]
};

function addLocalDevSettings(config) {
  config = Object.assign({}, LOCAL_DEV_CONFIG, config);
  config.resolve = config.resolve || {};
  config.resolve.alias = config.resolve.alias || {};
  Object.assign(config.resolve.alias, LOCAL_DEV_CONFIG.resolve.alias);

  config.module = config.module || {};
  Object.assign(config.module, {
    rules: (config.module.rules || []).concat(LOCAL_DEV_CONFIG.module.rules)
  });
  return config;
}

module.exports = config => env => {
  if (env && env.local) {
    config = addLocalDevSettings(config);
    // console.warn(JSON.stringify(config, null, 2));
  }

  return config;
};