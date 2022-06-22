// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Command, Flags} from '@oclif/core';
import {IPFS_NODE_ENDPOINT, IPFS_REGEX, NETWORK_FAMILY} from '@subql/common';
import {commonRules, deploymentRules, Validator} from '@subql/validator';
import chalk from 'chalk';

export default class Validate extends Command {
  static description = 'Check a folder or github repo is a validate subquery project';

  static flags = {
    location: Flags.string({char: 'l', description: 'local folder, github repo url or IPFS cid'}),
    ipfs: Flags.string({
      description: 'IPFS gateway endpoint, used for validating projects on IPFS',
      default: IPFS_NODE_ENDPOINT,
    }),
    silent: Flags.boolean(),
    'network-family': Flags.enum({options: Object.values(NETWORK_FAMILY)}),
  };

  //TODO, currently validation only work for complete project, ipfs deployment is not supported
  async run(): Promise<void> {
    const {flags} = await this.parse(Validate);
    const location = flags.location ?? process.cwd();
    const v = await Validator.create(location, {ipfs: flags.ipfs}, flags['network-family']);

    const ipfsMatch = location.match(IPFS_REGEX);
    if (ipfsMatch) {
      v.addRule(...deploymentRules);
    } else {
      v.addRule(...commonRules);
    }

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
