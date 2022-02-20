// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {u8aConcat} from '@polkadot/util';
import IPFS from 'ipfs-http-client';
import yaml from 'js-yaml';
import {IPackageJson} from 'package-json-type';
import {IPFS_CLIENT_ENDPOINT} from '../../constants';
import {Reader} from './reader';

export class IPFSReader implements Reader {
  private ipfs: IPFS.IPFSHTTPClient;

  constructor(private readonly cid: string, gateway?: string) {
    this.ipfs = IPFS.create({url: gateway ?? IPFS_CLIENT_ENDPOINT});
  }

  get root(): undefined {
    return undefined;
  }

  async getPkg(): Promise<IPackageJson | undefined> {
    return Promise.resolve(undefined);
  }

  async getProjectSchema(): Promise<unknown | undefined> {
    const projectYaml = await this.getFile(this.cid);
    if (projectYaml === undefined) {
      throw new Error(`Fetch project from ipfs ${this.cid} got undefined`);
    }
    return yaml.load(projectYaml);
  }

  async getFile(fileName: string): Promise<string | undefined> {
    try {
      const resolvedFileName = fileName.replace('ipfs://', '');
      const req = this.ipfs.cat(resolvedFileName);
      const scriptBufferArray: Uint8Array[] = [];
      for await (const res of req) {
        scriptBufferArray.push(res);
      }
      return Buffer.from(u8aConcat(...scriptBufferArray)).toString('utf8');
    } catch (e) {
      console.error(`Reader get file failed`, e);
      return undefined;
    }
  }
}
