// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {u8aConcat} from '@polkadot/util';
import {Reader} from '@subql/types-core';
import {IPFSHTTPClient, create} from 'ipfs-http-client';
import yaml from 'js-yaml';
import {IPackageJson} from 'package-json-type';
import {IPFS_NODE_ENDPOINT} from '../../constants';

const CIDv0 = new RegExp(/Qm[1-9A-Za-z]{44}[^OIl]/i);
const CIDv1 = new RegExp(
  /Qm[1-9A-HJ-NP-Za-km-z]{44,}|b[A-Za-z2-7]{58,}|B[A-Z2-7]{58,}|z[1-9A-HJ-NP-Za-km-z]{48,}|F[0-9A-F]{50,}/i
);

export class IPFSReader implements Reader {
  private ipfs: IPFSHTTPClient;
  private cache: Record<string, Promise<string>> = {};

  constructor(private readonly cid: string, gateway?: string) {
    if (!CIDv0.test(cid) && !CIDv1.test(cid)) {
      throw new Error('IPFS project path CID is not valid');
    }
    this.ipfs = create({url: gateway ?? IPFS_NODE_ENDPOINT});
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
      throw new Error(`Failed to fetch project from IPFS: ${this.cid}`);
    }
    return yaml.load(projectYaml);
  }

  async getFile(fileName: string): Promise<string | undefined> {
    try {
      if (this.cache[fileName] === undefined) {
        const resolvedFileName = fileName.replace('ipfs://', '');
        this.cache[fileName] = this.resultToBuffer(this.ipfs.cat(resolvedFileName));
      }
      return await this.cache[fileName];
    } catch (e) {
      console.error(`Failed to fetch file from IPFS: ${fileName}`, e);
      return undefined;
    }
  }

  private async resultToBuffer(req: AsyncIterable<Uint8Array>): Promise<string> {
    const scriptBufferArray: Uint8Array[] = [];
    for await (const res of req) {
      scriptBufferArray.push(res);
    }
    return Buffer.from(u8aConcat(...scriptBufferArray)).toString('utf8');
  }
}
