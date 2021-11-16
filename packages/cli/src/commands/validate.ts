// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Command, flags} from '@oclif/command';
import {commonRules, Validator} from '@subql/validator';
import chalk from 'chalk';

export default class Validate extends Command {
  static description = 'Check a folder or github repo is a validate subquery project';

  static flags = {
    location: flags.string({char: 'l', description: 'local folder, github repo url or IPFS cid'}),
    ipfs: flags.string({
      description: 'IPFS gateway endpoint, used for validating projects on IPFS',
      default: 'https://ipfs.thechainhub.com/api/v0',
    }),
    silent: flags.boolean(),
  };

  async run(): Promise<void> {
    const {flags} = this.parse(Validate);
    const v = new Validator(flags.location ?? process.cwd(), {ipfs: flags.ipfs});
    v.addRule(...commonRules);

    const reports = await v.getValidateReports();
    const passed = reports.filter((r) => r.valid).length;
    const skipped = reports.filter((r) => r.skipped).length;
    const failed = reports.length - passed - skipped;

    if (!flags.silent) {
      for (const r of reports) {
        if (r.valid) {
          this.log(`${chalk.bgGreen.bold(' PASS ')} ${r.name}`);
        } else if (r.skipped) {
          this.log(`${chalk.yellow.bold(' SKIP ')} ${r.name}`);
        } else {
          this.log(`${chalk.bgRed.bold(' FAIL ')} ${r.name}`);
          this.log(`       ${chalk.redBright(r.description)}`);
        }
      }

      this.log('');
      this.log(`Result: ${passed} passed, ${failed} failed, ${skipped} skipped`);
      this.log('');
    }

    if (failed > 0) {
      this.exit(1);
    }
  }
}
