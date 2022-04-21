// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import childProcess from 'child_process';
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
    path: outputDir,
    filename: '[name].js',
    libraryTarget: 'commonjs',
  },
});

export async function typescriptBuildCheck(projectDir: string): Promise<void> {
  await new Promise((resolve) => {
    childProcess.exec('tsc --noEmit', {cwd: projectDir}, (error, stdout, stderr) => {
      if (error) {
        // we want to hide the actual error log with message 'tsc --noEmit' here
        // instead printout stdout info
        console.error(`Project build check failed: \n${stdout}`);
        process.exit(1);
      }
      resolve(true);
    });
  });
}

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

        reject(info.errors[0].details);
        return;
      }

      resolve(true);
    });
  });
}
