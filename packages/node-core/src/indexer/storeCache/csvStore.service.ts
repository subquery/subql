// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs, {lstatSync} from 'fs';
import path from 'path';
import {Stringifier, stringify} from 'csv-stringify';
import {getLogger} from '../../logger';
import {Exporter} from './types';

const logger = getLogger('CsvStore');
export class CsvStoreService implements Exporter {
  private fileExist?: boolean;
  private stringifyStream: Stringifier;
  private readonly writeStream: fs.WriteStream;

  constructor(private modelName: string, private outputPath: string) {
    this.writeStream = fs.createWriteStream(this.getCsvFilePath(), {flags: 'a'});

    this.stringifyStream = stringify({header: !this.fileExist}).on('error', (err) => {
      logger.error(err, 'Failed to write to CSV');
      process.exit(1);
    });
    this.stringifyStream.pipe(this.writeStream);
  }

  private getCsvFilePath(): string {
    const resolvedDir = path.resolve(this.outputPath);
    if (fs.existsSync(resolvedDir) && lstatSync(resolvedDir).isDirectory()) {
      const filePath = path.resolve(this.outputPath, `${this.modelName}.csv`);

      this.fileExist = fs.existsSync(filePath);

      return filePath;
    }

    throw new Error(`${this.outputPath} does not exist`);
  }
  // eslint-disable-next-line @typescript-eslint/require-await
  async export(records: any[]): Promise<void> {
    const writeRecords = records.map((r: any) => {
      // remove store
      const {__block_range, store, ...orgRecord} = r;
      if (__block_range !== undefined) {
        return {
          ...orgRecord,
          __block_number: r.blockNumber,
        };
      }
      return orgRecord;
    });
    writeRecords.forEach((r) => {
      this.stringifyStream.write(r);
    });
  }

  async shutdown(): Promise<void> {
    return new Promise((resolve) => {
      this.writeStream.once('finish', () => {
        console.log('finish stream write', this.modelName);
        resolve();
      });

      this.stringifyStream.end();
    });
  }
}
