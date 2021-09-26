// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import IPFS from 'ipfs-http-client';
import yaml from 'js-yaml';
import {IPackageJson} from 'package-json-type';
import {Reader} from './reader';

export class IPFSReader implements Reader {
  private ipfs: IPFS.IPFSHTTPClient;

  constructor(private readonly cid: string, gateway: string) {
    if (!gateway) {
      throw new Error('IPFS Gateway not provided');
    }
    this.ipfs = IPFS.create({url: gateway});
  }

  async getPkg(): Promise<IPackageJson | undefined> {
    return Promise.resolve(undefined);
  }

  async getProjectSchema(): Promise<unknown | undefined> {
    const req = this.ipfs.cat(this.cid);

    // Should be first item
    for await (const res of req) {
      return yaml.load(Buffer.from(res).toString('utf8'));
    }
  }
}
