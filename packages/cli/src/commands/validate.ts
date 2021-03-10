// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Command, flags} from '@oclif/command';
import {commonRules, Validator} from '@subql/validator';
import chalk from 'chalk';

export default class Validate extends Command {
  static description = 'check a folder or github repo is a validate subquery project';

  static flags = {
    location: flags.string({char: 'l', description: 'local folder or github repo url'}),
    silent: flags.boolean(),
  };

  async run(): Promise<void> {
    const {flags} = this.parse(Validate);
    const v = new Validator(flags.location ?? process.cwd());
    v.addRule(...commonRules);

    const reports = await v.validate();
    const passed = reports.filter((r) => r.valid).length;
    const failed = reports.length - passed;

    if (!flags.silent) {
      for (const r of reports) {
        if (r.valid) {
          this.log(`${chalk.bgGreen.bold(' PASS ')} ${r.name}`);
        } else {
          this.log(`${chalk.bgRed.bold(' FAIL ')} ${r.name}`);
          this.log(`       ${chalk.redBright(r.description)}`);
        }
      }

      this.log('');
      this.log(`Result: ${passed} passed, ${failed} failed`);
      this.log('');
    }

    if (failed > 0) {
      this.exit(1);
    }
  }
}
