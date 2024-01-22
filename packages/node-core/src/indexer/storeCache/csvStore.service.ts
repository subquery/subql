// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'fs';
import path from 'path';
import {stringify} from 'csv-stringify';

export class CsvStoreService {
  constructor(private modelName: string, private schema: string, private outputPath: string) {}

  private getCsvFilePath(): string {
    // TODO join relative to absolute
    return path.join(this.outputPath, `${this.schema}-${this.modelName}.csv`);
  }

  async export(records: any[]): Promise<void> {
    let fileExist: boolean;
    const csvFilePath = this.getCsvFilePath();
    const writeRecords: any[] = [];

    records.forEach((r: any) => {
      // remove store
      const {__block_range, store, ...orgRecord} = r;
      if (__block_range !== undefined) {
        writeRecords.push({
          ...orgRecord,
          __block_range: r.blockNumber,
        });
      } else {
        writeRecords.push(orgRecord);
      }
    });

    try {
      await fs.promises.stat(csvFilePath);
      fileExist = true;
    } catch (error) {
      fileExist = false;
    }

    return new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(csvFilePath, {flags: 'a'});

      stringify(writeRecords, {header: !fileExist})
        .on('error', (err) => {
          reject(err);
        })
        .pipe(writeStream)
        .on('finish', () => {
          resolve();
        })
        .on('error', (err) => {
          reject(err);
        });
    });
  }
}
