// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import webpack, {Configuration} from 'webpack';
import {merge} from 'webpack-merge';

const getBaseConfig = (
  buildEntries: Configuration['entry'],
  projectDir: string,
  outputDir: string,
  development?: boolean
): webpack.Configuration => ({
  target: 'node',
  mode: development ? 'development' : 'production',
  context: projectDir,
  entry: buildEntries,
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
    path: `${projectDir}/${outputDir}`,
    filename: '[name].js',
    libraryTarget: 'commonjs',
  },
});

export async function runWebpack(
  buildEntries: Configuration['entry'],
  projectDir: string,
  outputDir: string,
  isDev = false,
  clean = false
): Promise<void> {
  const config = merge(
    getBaseConfig(buildEntries, projectDir, outputDir, isDev),
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
