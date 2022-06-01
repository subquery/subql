// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

// import {readFileSync, existsSync} from 'fs';
// import path from 'path';
import {Command, Flags} from '@oclif/core';
// import {getProjectRootAndManifest} from '@subql/common';
// import {uploadToIpfs} from '../controller/publish-controller';
// import Build from './build';

// const ACCESS_TOKEN_PATH = path.resolve(process.env.HOME, '.subql/SUBQL_ACCESS_TOKEN');

export default class GenerateToken extends Command {
  static description = 'Generate SUBQL_ACCESS_TOKEN';

  // API endpoint
  // https://api.subquery.network/user/regenerate-token

  // Cookie:
  // connect.sid=s%3ATpgH4inKUNFugxvMW16vZH7ZfcnRscAi.4BpS2bT3vBmIaFNcmnlDwoT2avbtjjiEueEZjHJ2bI8; mp_d14ddd0ce26a2d80cc6decbf76b2c2a0_mixpanel=%7B%22distinct_id%22%3A%20%22Z2l0aHVifDg5MzM1MDMz%22%2C%22%24device_id%22%3A%20%2218111fe66461091-0e9435d16bd75d-3a62684b-13c680-18111fe66471101%22%2C%22%24initial_referrer%22%3A%20%22%24direct%22%2C%22%24initial_referring_domain%22%3A%20%22%24direct%22%2C%22__mps%22%3A%20%7B%7D%2C%22__mpso%22%3A%20%7B%7D%2C%22__mpus%22%3A%20%7B%7D%2C%22__mpa%22%3A%20%7B%7D%2C%22__mpu%22%3A%20%7B%7D%2C%22__mpr%22%3A%20%5B%5D%2C%22__mpap%22%3A%20%5B%5D%2C%22%24user_id%22%3A%20%22Z2l0aHVifDg5MzM1MDMz%22%7D

  //Oauth security

  //
  static flags = {
    // location: Flags.string({char: 'f', description: 'from project or manifest path'}),
    getToken: Flags.string({description: 'generate token?', required: true}),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(GenerateToken);
    // const {flags} = await this.parse(Publish);

    // const project = getProjectRootAndManifest(flags.location ? path.resolve(flags.location) : process.cwd());

    // Ensure user is logged in or OAuth is implemented

    // let authToken: string;

    // if (process.env.SUBQL_ACCESS_TOKEN) {
    //   authToken = process.env.SUBQL_ACCESS_TOKEN;
    // } else if (existsSync(ACCESS_TOKEN_PATH)) {
    //   try {
    //     authToken = process.env.SUBQL_ACCESS_TOKEN ?? readFileSync(ACCESS_TOKEN_PATH, 'utf8');
    //   } catch (e) {
    //     throw new Error(`Failed to read SUBQL_ACCESS_TOKEN from ${ACCESS_TOKEN_PATH}: ${e}`);
    //   }
    // } else {
    //   throw new Error('Please provide SUBQL_ACCESS_TOKEN before publish');
    // }

    this.log('Uploading SupQuery project to IPFS');
    // const cid = await uploadToIpfs(project.manifest, authToken.trim(), flags.ipfs).catch((e) => this.error(e));
    // this.log(`SubQuery Project uploaded to IPFS: ${cid}`);
    this.log(``);
  }
}
