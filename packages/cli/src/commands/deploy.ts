// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {readFileSync, existsSync} from 'fs';
import path from 'path';
import {Command, Flags} from '@oclif/core';
import {deployToHostedService} from '../controller/deploy-controller';

const ACCESS_TOKEN_PATH = path.resolve(process.env.HOME, '.subql/SUBQL_ACCESS_TOKEN');

export default class Deploy extends Command {
  static description = 'Deploy to hosted service';

  static flags = {
    // required
    key: Flags.string({description: 'enter key', required: true}),
    ipfs: Flags.string({description: 'IPFS CID', required: true}),

    // not required
    token: Flags.string({description: 'enter token', required: false}),
    type: Flags.string({description: 'enter type', required: false}),
    dict: Flags.string({description: 'enter dict', required: false}),
    indexerVersion: Flags.string({description: 'enter indexer-version', required: false}),
    queryVersion: Flags.string({description: 'enter query-version', required: false}),
    endpoint: Flags.string({description: 'enter endpoint', required: false}),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Deploy);
    let authToken: string;

    if (flags.token) {
      authToken = flags.token;
    } else if (process.env.SUBQL_ACCESS_TOKEN) {
      authToken = process.env.SUBQL_ACCESS_TOKEN;
    } else if (existsSync(ACCESS_TOKEN_PATH)) {
      try {
        authToken = process.env.SUBQL_ACCESS_TOKEN ?? readFileSync(ACCESS_TOKEN_PATH, 'utf8');
      } catch (e) {
        throw new Error(`Failed to read SUBQL_ACCESS_TOKEN from ${ACCESS_TOKEN_PATH}: ${e}`);
      }
    } else {
      throw new Error('Please provide SUBQL_ACCESS_TOKEN before deployment');
    }

    if (flags.ipfs === undefined) {
      throw new Error('Please provide ipfs');
    }
    if (flags.key === undefined) {
      throw new Error('Please provide key');
    }

    this.log('Deploying SupQuery project to Hosted Service');
    const deploying = await deployToHostedService(
      flags.key,
      authToken,
      flags.ipfs,
      flags.indexerVersion,
      flags.queryVersion,
      flags.endpoint,
      flags.type,
      flags.dict
    ).catch((e) => this.error(e));
    this.log(`${deploying}`);
  }
}
