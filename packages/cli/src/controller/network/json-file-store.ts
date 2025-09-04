// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'node:fs';
import {IKeyValueStorage} from '@walletconnect/keyvaluestorage';

export class JSONFileStorage implements IKeyValueStorage {
  private writeQueue = Promise.resolve();

  constructor(private readonly sessionPath: string) {}

  async #readData(): Promise<Record<string, any> | null> {
    if (!fs.existsSync(this.sessionPath)) return null;
    const raw = await fs.promises.readFile(this.sessionPath, 'utf-8');
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  async #writeData(data: Record<string, any>): Promise<void> {
    await fs.promises.writeFile(this.sessionPath, JSON.stringify(data, null, 2));
  }

  async getKeys(): Promise<string[]> {
    const data = await this.#readData();
    return data ? Object.keys(data) : [];
  }

  async getEntries<T = any>(): Promise<[string, T][]> {
    const data = await this.#readData();
    return data ? (Object.entries(data) as [string, T][]) : [];
  }

  async getItem<T = any>(key: string): Promise<T | undefined> {
    const data = await this.#readData();
    return data?.[key];
  }

  async setItem<T = any>(key: string, value: T): Promise<void> {
    this.writeQueue = this.writeQueue.then(async () => {
      const data = (await this.#readData()) ?? {};
      data[key] = value;
      await this.#writeData(data);
    });
    return this.writeQueue;
  }

  async removeItem(key: string): Promise<void> {
    this.writeQueue = this.writeQueue.then(async () => {
      const data = await this.#readData();
      if (!data) return;
      delete data[key];
      await this.#writeData(data);
    });
    return this.writeQueue;
  }
}
