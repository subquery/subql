// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {u8aConcat} from '@polkadot/util';
import {Reader} from '@subql/types-core';
import yaml from 'js-yaml';
import type {IPackageJson} from 'package-json-type';
import {IPFS_NODE_ENDPOINT} from '../../constants';
import {IPFSHTTPClientLite} from '../IpfsHttpClientLite';

const CIDv0 = new RegExp(/Qm[1-9A-Za-z]{44}[^OIl]/i);
const CIDv1 = new RegExp(
  /Qm[1-9A-HJ-NP-Za-km-z]{44,}|b[A-Za-z2-7]{58,}|B[A-Z2-7]{58,}|z[1-9A-HJ-NP-Za-km-z]{48,}|F[0-9A-F]{50,}/i
);

export class IPFSReader implements Reader {
  private ipfs: IPFSHTTPClientLite;
  private cache: Record<string, Promise<string>> = {};

  constructor(private readonly cid: string, gateway?: string) {
    if (!CIDv0.test(cid) && !CIDv1.test(cid)) {
      throw new Error('IPFS project path CID is not valid');
    }
    this.ipfs = new IPFSHTTPClientLite({url: gateway ?? IPFS_NODE_ENDPOINT});
  }

  get root(): undefined {
    return undefined;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getPkg(): Promise<IPackageJson> {
    throw new Error("IPFS Reader doesn't support reading package.json");
  }

  async getProjectSchema(): Promise<unknown> {
    const projectYaml = await this.getFile(this.cid);
    return yaml.load(projectYaml);
  }

  async getFile(fileName: string): Promise<string> {
    try {
      if (this.cache[fileName] === undefined) {
        const resolvedFileName = fileName.replace('ipfs://', '');
        this.cache[fileName] = this.resultToBuffer(this.ipfs.cat(resolvedFileName));
      }
      return await this.cache[fileName];
    } catch (e) {
      console.error(`Failed to fetch file from IPFS: ${fileName}`, e);
      throw new Error(`Failed to fetch file from IPFS: ${fileName}`, {cause: e});
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
