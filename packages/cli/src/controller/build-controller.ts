// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import {readFileSync} from 'fs';
import path from 'path';
import {globSync} from 'glob';
import TerserPlugin from 'terser-webpack-plugin';
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
  devtool: 'inline-source-map',
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          sourceMap: true,
          format: {
            beautify: true,
          },
        },
      }),
    ],
  },
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
      assert(stats, 'Webpack stats is undefined');

      if (stats.hasErrors()) {
        const info = stats.toJson();

        reject(info.errors?.map((e) => e.message).join('\n') ?? 'Unknown error');
        return;
      }

      resolve(true);
    });
  });
}

export function getBuildEntries(directory: string): Record<string, string> {
  // FIXME: this is an assumption that the default entry is src/index.ts, in reality it should read from the project manifest
  const defaultEntry = path.join(directory, 'src/index.ts');
  let buildEntries: Record<string, string> = {
    index: defaultEntry,
  };

  globSync(path.join(directory, 'src/test/**/*.test.ts')).forEach((testFile) => {
    const testName = path.basename(testFile).replace('.ts', '');
    buildEntries[`test/${testName}`] = testFile;
  });

  globSync(path.join(directory, 'src/tests/**/*.test.ts')).forEach((testFile) => {
    const testName = path.basename(testFile).replace('.ts', '');
    buildEntries[`tests/${testName}`] = testFile;
  });

  // Get the output location from the project package.json main field
  const pjson = JSON.parse(readFileSync(path.join(directory, 'package.json')).toString());
  if (pjson.exports && typeof pjson.exports !== 'string') {
    buildEntries = Object.entries(pjson.exports as Record<string, string>).reduce(
      (acc, [key, value]) => {
        acc[key] = path.resolve(directory, value);
        return acc;
      },
      {...buildEntries}
    );
  }

  for (const i in buildEntries) {
    if (typeof buildEntries[i] !== 'string') {
      console.warn(`Ignoring entry ${i} from build.`);
      delete buildEntries[i];
    }
  }

  return buildEntries;
}
