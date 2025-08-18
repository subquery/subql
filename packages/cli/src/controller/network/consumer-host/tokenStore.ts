// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'node:fs';
import {SQNetworks} from '@subql/network-config';
import {CONSUMER_HOST_STORE_PATH} from '../../../constants';

export interface TokenStore {
  getToken(network: SQNetworks): Promise<string | undefined>;
  setToken(network: SQNetworks, token: string): Promise<void>;
  clearToken(network: SQNetworks): Promise<void>;
}

type StoreData = Partial<Record<SQNetworks, string>>;

export class FileTokenStore implements TokenStore {
  #writeQueue: Promise<void> = Promise.resolve();

  constructor(private filePath = CONSUMER_HOST_STORE_PATH) {}

  async #readData(): Promise<StoreData | null> {
    if (!fs.existsSync(this.filePath)) return null;
    const raw = await fs.promises.readFile(this.filePath, 'utf-8');
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  async #writeData(data: StoreData): Promise<void> {
    await fs.promises.writeFile(this.filePath, JSON.stringify(data, null, 2));
  }

  async setToken(network: SQNetworks, token: string): Promise<void> {
    this.#writeQueue = this.#writeQueue.then(async () => {
      const data = (await this.#readData()) || {};
      data[network] = token;
      await this.#writeData(data);
    });
    return this.#writeQueue;
  }

  async getToken(network: SQNetworks): Promise<string | undefined> {
    const data = await this.#readData();
    return data?.[network];
  }

  async clearToken(network: SQNetworks): Promise<void> {
    this.#writeQueue = this.#writeQueue.then(async () => {
      const data = await this.#readData();
      if (!data) return;
      delete data[network];
      await this.#writeData(data);
    });
    return this.#writeQueue;
  }
}
