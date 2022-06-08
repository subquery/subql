// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {readFileSync, existsSync} from 'fs';
import path from 'path';
import {Command, Flags} from '@oclif/core';
import {DEFAULT_DEPLOYMENT_TYPE, DEFAULT_DICT_ENDPOINT, DEFAULT_ENDPOINT, INDEXER_V, QUERY_V} from '@subql/common';
import cli from 'cli-ux';
import {deployToHostedService} from '../../controller/deploy-controller';

const ACCESS_TOKEN_PATH = path.resolve(process.env.HOME, '.subql/SUBQL_ACCESS_TOKEN');

export default class Deploy extends Command {
  static description = 'Deployment to hosted service';

  static flags = {
    // required values
    key: Flags.string({description: 'enter project key e.g. subquery/hello-world'}),
    ipfsCID: Flags.string({description: 'Enter IPFS CID'}),

    // optional values
    type: Flags.string({description: 'enter type', default: DEFAULT_DEPLOYMENT_TYPE}),
    dict: Flags.string({description: 'enter dict', default: DEFAULT_DICT_ENDPOINT}),
    indexerVersion: Flags.string({description: 'enter indexer-version', default: INDEXER_V}),
    queryVersion: Flags.string({description: 'enter query-version', default: QUERY_V}),
    endpoint: Flags.string({description: 'enter endpoint', default: DEFAULT_ENDPOINT}),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Deploy);
    let authToken: string;
    let projectKey: string = flags.key;
    let ipfsCID: string = flags.ipfsCID;

    if (process.env.SUBQL_ACCESS_TOKEN) {
      authToken = process.env.SUBQL_ACCESS_TOKEN;
    } else if (existsSync(ACCESS_TOKEN_PATH)) {
      try {
        authToken = process.env.SUBQL_ACCESS_TOKEN ?? readFileSync(ACCESS_TOKEN_PATH, 'utf8');
      } catch (e) {
        authToken = await cli.prompt('Token cannot be found, Enter token');
      }
    } else {
      authToken = await cli.prompt('Enter token');
    }

    if (!flags.ipfsCID || flags.ipfsCID === '') {
      try {
        ipfsCID = await cli.prompt('Enter IPFS CID');
      } catch (e) {
        throw new Error('Please provide ipfs');
      }
    }
    if (!flags.key || flags.key === '') {
      try {
        projectKey = await cli.prompt('Enter project key e.g. subquery/hello-world');
      } catch (e) {
        throw new Error('Please provide key');
      }
    }

    this.log('Deploying SupQuery project to Hosted Service');
    const deploying = await deployToHostedService(
      projectKey,
      authToken,
      ipfsCID,
      flags.indexerVersion,
      flags.queryVersion,
      flags.endpoint,
      flags.type,
      flags.dict
    ).catch((e) => this.error(e));
    this.log(`${deploying}`);
  }
}
