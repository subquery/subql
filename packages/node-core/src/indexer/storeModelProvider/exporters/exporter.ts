// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {BaseEntity} from '../model';

export interface Exporter<T extends BaseEntity = BaseEntity> {
  /**
   * Exports an array of records.
   * This method should handle the processing of the provided records.
   *
   * @param records An array of records to be exported.
   *                These records are of the same type as the database entries
   */
  export: (record: T[]) => Promise<void>;
  /**
   * Shuts down the export operation.
   * This method should ensure that all ongoing export operations are
   * completed and any resources used are properly released or closed.
   *
   * @returns A promise that resolves when the shutdown process is complete.
   */
  shutdown: () => Promise<void>;
}

export type TransactionedExporter<T extends BaseEntity = BaseEntity> = Exporter<T> & {commit: () => Promise<void>};

export function isTxExporter<T extends BaseEntity = BaseEntity>(
  exporter: Exporter<T>
): exporter is TransactionedExporter<T> {
  return typeof (exporter as TransactionedExporter).commit === 'function';
}

export function asTxExporter<T extends BaseEntity = BaseEntity>(exporter: Exporter<T>): TransactionedExporter<T> {
  if (isTxExporter(exporter)) return exporter;
  return new TxExporter(exporter);
}

export class TxExporter<T extends BaseEntity = BaseEntity> implements TransactionedExporter<T> {
  #pendingData: T[] = [];
  #exporter: Exporter<T>;

  constructor(exporter: Exporter<T>) {
    this.#exporter = exporter;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async export(data: T[]): Promise<void> {
    this.#pendingData.push(...data);
  }

  async shutdown(): Promise<void> {
    await this.commit();
    await this.#exporter.shutdown();
  }

  async commit(): Promise<void> {
    await this.#exporter.export(this.#pendingData);
    this.#pendingData = [];
  }
}
