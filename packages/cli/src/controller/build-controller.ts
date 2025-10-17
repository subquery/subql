// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import {readFileSync, existsSync} from 'fs';
import path from 'path';
import {globSync} from 'glob';
import {parse} from 'jsonc-parser';
import TerserPlugin from 'terser-webpack-plugin';
import {TsconfigPathsPlugin} from 'tsconfig-paths-webpack-plugin';
import webpack, {Configuration} from 'webpack';
import {merge} from 'webpack-merge';
import {Logger} from '../adapters/utils';
import {loadEnvConfig, getWebpackEnvDefinitions} from '../utils/env';

/**
 * Webpack has been chosen as the bundler for a few reasons.
 * There was a change to esbuild that lead to more problems than it solved.
 * These are the reasons for using webpack:
 * * Good tree shaking including of dependencies. e.g imports to 'ethers' will result in tree shaking of unused code like Providers, this is to avoid importing 'unsafe' node imports like 'http'.
 * * Correctly hoists polyfills. So if something like `global.TextDecoder = SomeOtherTextDecoder` will be set before any other code is run. esbuild does not do this.
 * * There is some issues with pnpm resolving the @subql/types-* and @subql/types-core global entities correctly. This was the reason for switching to esbuild
 */

const getBaseConfig = (
  buildEntries: Configuration['entry'],
  projectDir: string,
  outputDir: string,
  development?: boolean
): webpack.Configuration => {
  // Load environment variables from .env file
  const envConfig = loadEnvConfig(projectDir);
  const envDefinitions = getWebpackEnvDefinitions(envConfig);

  return {
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
    plugins: [new webpack.DefinePlugin(envDefinitions)],
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
      plugins: [],
    },

    output: {
      path: outputDir,
      filename: '[name].js',
      libraryTarget: 'commonjs',
    },
  };
};

export function loadTsConfig(projectDir: string): any {
  const tsconfigPath = path.join(projectDir, 'tsconfig.json');
  if (existsSync(tsconfigPath)) {
    const tsconfig = readFileSync(tsconfigPath, 'utf-8');
    const tsconfigJson = parse(tsconfig);

    return tsconfigJson;
  }
}

export async function runBundle(
  buildEntries: Record<string, string>,
  projectDir: string,
  outputDir: string,
  isDev = false,
  clean = false,
  logger?: Logger
): Promise<void> {
  // Injecting polyfills if they exist, this allows setting global variables like TextDecoder/TextEncoder
  const inject = [path.resolve(projectDir, './src/polyfill.ts'), path.resolve(projectDir, './src/polyfills.ts')].filter(
    (file) => existsSync(file)
  );

  if (inject.length) {
    logger?.warn(
      'Support for pollyfill files has been removed. Please move the code to the top of your entry index.ts file'
    );
  }

  const config = merge(
    getBaseConfig(buildEntries, projectDir, outputDir, isDev),
    {output: {clean}}
    // Can allow projects to override webpack config here
  );

  const tsConfig = loadTsConfig(projectDir);
  if (tsConfig?.compilerOptions?.paths && config.resolve && config.resolve.plugins) {
    config.resolve.plugins.push(new TsconfigPathsPlugin());
  }

  await new Promise((resolve, reject) => {
    const wp = webpack(config);

    if (!wp) {
      throw new Error('Webpack failed to initialize');
    }

    wp.run((error, stats) => {
      if (error) {
        reject(error);
        return;
      }
      assert(stats, 'Webpack stats is undefined');

      if (stats.hasErrors()) {
        const info = stats.toJson();

        reject(new Error(info.errors?.map((e) => e.message).join('\n') ?? 'Unknown error'));
        return;
      }

      resolve(true);
    });
  });
}

export function getBuildEntries(directory: string, logger?: Logger): Record<string, string> {
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
      logger?.warn(`Ignoring entry ${i} from build.`);
      delete buildEntries[i];
    }
  }

  return buildEntries;
}
