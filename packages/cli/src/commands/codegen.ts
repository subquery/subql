// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import {Command, Flags} from '@oclif/core';
import {getProjectRootAndManifest} from '@subql/common';
import {codegen} from '../controller/codegen-controller';

export default class Codegen extends Command {
  static description = 'Generate schemas for graph node';

  static flags = {
    location: Flags.string({
      char: 'l',
      description: '[deprecated] local folder to run codegen in. please use file flag instead',
    }),
    file: Flags.string({char: 'f', description: 'specify manifest file path (will overwrite -l if both used)'}),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Codegen);
    this.log('===============================');
    this.log('---------Subql Codegen---------');
    this.log('===============================');

    const {file, location} = flags;

    const projectPath = path.resolve(file ?? location ?? process.cwd());

    const {manifest} = getProjectRootAndManifest(projectPath);

    // Split directory and file name
    const [fileDir, fileName] = [path.dirname(manifest), path.basename(manifest)];

    try {
      if (!fileDir) {
        throw new Error('Cannot resolve project manifest from --file argument given');
      }
      await codegen(fileDir, fileName);
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
  }
}
