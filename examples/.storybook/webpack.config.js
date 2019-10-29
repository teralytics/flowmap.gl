/*
 * Copyright 2018 Teralytics
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

const Dotenv = require('dotenv-webpack');

module.exports = async ({ config, mode }) => {
  config.resolve.extensions = ['.ts', '.tsx', '.js', '.jsx', '.json'];
  config.plugins.push(
    new Dotenv({
      path: '../.env',
    })
  );
  config.module.rules = [
    {
      test: /\.tsx?$/,
      loader: 'awesome-typescript-loader',
      exclude: /node_modules/,
    },
    {
      test: /\.(png|jpg|gif)$/,
      loader: 'url-loader',
      exclude: /node_modules/,
      options: {
        limit: 8192,
      }
    },
    {
      test: /\.css$/,
      use: ['style-loader', 'css-loader'],
    }
  ];

  return config;
};
