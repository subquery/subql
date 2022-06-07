// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {readFileSync, existsSync} from 'fs';
import path from 'path';
import {Command, Flags} from '@oclif/core';
// import {deployToHostedService} from '../controller/deploy-controller';
// import { ArgInput } from '@oclif/core/lib/interfaces';

const ACCESS_TOKEN_PATH = path.resolve(process.env.HOME, '.subql/SUBQL_ACCESS_TOKEN');

export default class Deploy extends Command {
  static description = 'Deployment to hosted service';
  static args = [
    {
      name: 'deploy',
      description: 'Deploy to hosted service',
    },
    {name: 'promote'},
    {name: 'deploy'},
  ];

  static flags = {
    // shared flags
    token: Flags.string({description: 'enter token', required: false}),
    key: Flags.string({description: 'enter project key e.g. subquery/hello-world'}),

    // Deploy
    ipfsCID: Flags.string({description: 'Enter IPFS CID'}),
    type: Flags.string({description: 'enter type', required: false}),
    dict: Flags.string({description: 'enter dict', required: false}),
    indexerVersion: Flags.string({description: 'enter indexer-version', required: false}),
    queryVersion: Flags.string({description: 'enter query-version', required: false}),
    endpoint: Flags.string({description: 'enter endpoint', required: false}),

    // Promote && Delete
    deploymentID: Flags.string({description: 'Enter deployment ID', required: false}),
  };

  async run(): Promise<void> {
    const {argv, flags} = await this.parse(Deploy);
    let authToken: string;

    // Check if token is provided
    // if (flags.token) {
    //   authToken = flags.token;
    // } else if (process.env.SUBQL_ACCESS_TOKEN) {
    //   authToken = process.env.SUBQL_ACCESS_TOKEN;
    // } else if (existsSync(ACCESS_TOKEN_PATH)) {
    //   try {
    //     authToken = process.env.SUBQL_ACCESS_TOKEN ?? readFileSync(ACCESS_TOKEN_PATH, 'utf8');
    //   } catch (e) {
    //     throw new Error(`Failed to read SUBQL_ACCESS_TOKEN from ${ACCESS_TOKEN_PATH}: ${e}`);
    //   }
    // } else {
    //   throw new Error('Please provide SUBQL_ACCESS_TOKEN before deployment');
    // }

    // if (flags.ipfsCID === undefined) {
    //   throw new Error('Please provide ipfs');
    // }
    // if (flags.key === undefined) {
    //   throw new Error('Please provide key');
    // }
    if (argv[0] === 'deploy') {
      this.log(`${argv[0]}`);
      this.log(`token: ${flags.token}`);
      this.log(`projectKey: ${flags.key}`);
    }

    if (argv[0] === 'promote') {
      this.log(`${argv[0]}`);
      this.log(`token: ${flags.token}`);
      this.log(`token: ${flags.dict}`);
      this.log(`projectKey: ${flags.queryVersion}`);
    }

    if (argv[0] === 'delete') {
      this.log(`${argv[0]}`);
      this.log(`token: ${flags.token}`);
      this.log(`projectKey: ${flags.key}`);
    }

    // this.log('Deploying SupQuery project to Hosted Service');

    // const deploying = await deployToHostedService(
    // flags.key,
    // authToken,
    // flags.ipfs,
    // flags.indexerVersion,
    // flags.queryVersion,
    // flags.endpoint,
    // flags.type,
    // flags.dict
    // ).catch((e) => this.error(e));
    // this.log(`hi`);
  }
}
