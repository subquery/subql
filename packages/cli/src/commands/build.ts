// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {lstatSync, readFileSync} from 'fs';
import path from 'path';
import {Command, flags} from '@oclif/command';
import webpack from 'webpack';
import {merge} from 'webpack-merge';
import Validate from './validate';

const getBaseConfig = (dir: string, outputPath: string, development?: boolean): webpack.Configuration => ({
  target: 'node',
  mode: development ? 'development' : 'production',
  entry: path.join(dir, 'src/index.ts'),
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
    clean: true,
  },
});

export default class Build extends Command {
  static description = 'Build this SubQuery project code';

  static flags = {
    location: flags.string({char: 'l', description: 'local folder'}),
    mode: flags.enum({options: ['production', 'prod', 'development', 'dev'], default: 'production'}),
  };

  async run(): Promise<void> {
    const {flags} = this.parse(Build);

    const directory = flags.location ? path.resolve(flags.location) : process.cwd();
    const isDev = flags.mode === 'development' || flags.mode === 'dev';

    if (!lstatSync(directory).isDirectory()) {
      this.error('Argument `location` is not a valid directory');
    }

    // Check that we're in a valid project
    try {
      await Validate.run(['--silent', '--location', directory]);
    } catch (e) {
      this.error('Directory is not a valid project');
    }

    // Get the output location from the project package.json main field
    const pjson = JSON.parse(readFileSync(path.join(directory, 'package.json')).toString());
    const outputPath = path.resolve(directory, pjson.main || 'dist/index.js');

    const config = merge(
      getBaseConfig(directory, outputPath, isDev)
      // Can allow projects to override webpack config here
    );

    // Use webpack to build TS code and package into a single file
    this.log(`Building code${isDev ? ' with development mode' : ''}`);
    await new Promise((resolve, reject) => {
      webpack(config).run((error, stats) => {
        if (error) {
          reject(error);
          this.log(error.message);
          return;
        }

        if (stats.hasErrors()) {
          const info = stats.toJson();

          reject(info.errors[0]);
          this.log(info.errors[0].details);
          return;
        }

        this.log('Finished building code');
        resolve(true);
      });
    });
  }
}
