// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Command, flags} from '@oclif/command';
import {codegen} from '../controller/codegen-controller';

export default class Codegen extends Command {
  static description = 'Generate schemas for graph node';

  static flags = {
    force: flags.boolean({char: 'f'}),
    file: flags.string(),
  };

  async run(): Promise<void> {
    this.log('===============================');
    this.log('---------Subql Codegen---------');
    this.log('===============================');
    try {
      await codegen(process.cwd());
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
  }
}
