// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import {Command, Flags} from '@oclif/core';
import {codegen} from '../controller/codegen-controller';

export default class Codegen extends Command {
  static description = 'Generate schemas for graph node';

  static flags = {
    file: Flags.string({char: 'f', description: 'Specify manifest file path'}),
    location: Flags.string({char: 'l', description: 'local folder to run codegen in'}),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Codegen);
    this.log('===============================');
    this.log('---------Subql Codegen---------');
    this.log('===============================');

    const {file, location} = flags;

    const [fileDir, fileName] = file ? [path.dirname(file), path.basename(file)] : [undefined, undefined];
    const resolvedLocation = fileDir ?? (location ? path.resolve(location) : process.cwd());

    try {
      await codegen(resolvedLocation, fileName);
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
  }
}
