// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {u8aConcat} from '@polkadot/util';
import {IPFS_NODE_ENDPOINT} from '@subql/common';
import IPFS from 'ipfs-http-client';
import yaml from 'js-yaml';
import {IPackageJson} from 'package-json-type';
import {Reader} from './reader';

const CIDv0 = new RegExp(/Qm[1-9A-Za-z]{44}[^OIl]/i);
const CIDv1 = new RegExp(
  /Qm[1-9A-HJ-NP-Za-km-z]{44,}|b[A-Za-z2-7]{58,}|B[A-Z2-7]{58,}|z[1-9A-HJ-NP-Za-km-z]{48,}|F[0-9A-F]{50,}/i
);

export class IPFSReader implements Reader {
  private ipfs: IPFS.IPFSHTTPClient;

  constructor(private readonly cid: string, gateway?: string) {
    if (!CIDv0.test(cid) && !CIDv1.test(cid)) {
      throw new Error('IPFS project path CID is not valid');
    }
    this.ipfs = IPFS.create({url: gateway ?? IPFS_NODE_ENDPOINT});
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
