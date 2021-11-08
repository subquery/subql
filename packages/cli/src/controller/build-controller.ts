// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import webpack from 'webpack';
import {merge} from 'webpack-merge';

const getBaseConfig = (entryPath: string, outputPath: string, development?: boolean): webpack.Configuration => ({
  target: 'node',
  mode: development ? 'development' : 'production',
  entry: entryPath,
  devtool: development && 'inline-source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        loader: require.resolve('ts-loader'),
        options: {
          compilerOptions: {
            declaration: false,
          },
        },
      },
      {
        test: /\.ya?ml$/,
        use: 'yaml-loader',
      },
    ],
  },

  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.json'],
  },

  output: {
    path: path.dirname(outputPath),
    filename: path.basename(outputPath),
    libraryTarget: 'commonjs',
  },
});

export async function runWebpack(entryPath: string, outputPath: string, isDev = false, clean = false): Promise<void> {
  const config = merge(
    getBaseConfig(entryPath, outputPath, isDev),
    {output: {clean}}
    // Can allow projects to override webpack config here
  );

  await new Promise((resolve, reject) => {
    webpack(config).run((error, stats) => {
      if (error) {
        reject(error);
        return;
      }

      if (stats.hasErrors()) {
        const info = stats.toJson();

        reject(info.errors[0]);
        this.log(info.errors[0].details);
        return;
      }

      resolve(true);
    });
  });
}
