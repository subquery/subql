// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import child from 'child_process';
import {lstatSync} from 'fs';
import path from 'path';
import {Command, flags} from '@oclif/command';
import webpack from 'webpack';
import {merge} from 'webpack-merge';
import Validate from './validate';

const getBaseConfig = (dir: string): webpack.Configuration => ({
  target: 'node',
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  entry: path.join(dir, 'src/index.ts'),
  devtool: 'inline-source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },

  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },

  output: {
    path: path.resolve(dir, 'dist'),
    filename: 'index.js',
    libraryTarget: 'commonjs',
  },
});

export default class Pack extends Command {
  static description = 'Pack this SubQuery project';

  static flags = {
    location: flags.string({char: 'l', description: 'local folder'}),
  };

  async run(): Promise<void> {
    const {flags} = this.parse(Pack);

    const directory = path.resolve(flags.location) ?? process.cwd();

    if (!lstatSync(directory).isDirectory()) {
      this.error('Argument `location` is not a valid directory');
    }

    // Check that we're in a valid project
    try {
      await Validate.run(['--silent', '--location', directory]);
    } catch (e) {
      this.error('Directory is not a valid project');
    }

    const config = merge(
      getBaseConfig(directory)
      // Can allow projects to override webpack config here
    );

    // Make sure directory is clean first
    child.execSync('rm -rf dist');

    // Use webpack to build TS code and package into a single file
    this.log('Building code');
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

    // Simplest way to bundle up the files we need into an archive
    this.log('Packinging your SubQuery Project ...');
    child.execSync('npm pack');
    this.log('Finished packing!');
  }
}
