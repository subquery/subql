// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'fs';
import path from 'path';
import {Stringifier, stringify} from 'csv-stringify';
import {getLogger} from '../../logger';
import {FileExporter} from './types';

const logger = getLogger('CsvStore');
export class CsvStoreService implements FileExporter {
  private fileExist?: boolean;
  private stringifyStream: Stringifier;
  constructor(private modelName: string, private outputPath: string) {
    const writeStream = fs.createWriteStream(this.getCsvFilePath(), {flags: 'a'});

    this.stringifyStream = stringify({header: !this.fileExist}).on('error', (err) => {
      logger.error('Failed to write to CSV', err);
      process.exit(1);
    });

    this.stringifyStream.pipe(writeStream);
  }

  private getCsvFilePath(): string {
    if (!fs.existsSync(path.resolve(this.outputPath))) {
      throw new Error(`${this.outputPath} does not exist`);
    }
    const filePath = path.resolve(this.outputPath, `${this.modelName}.csv`);

    this.fileExist = fs.existsSync(filePath);

    return filePath;
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
      if (this.modelName === 'Transfer') {
        console.log(r?.id);
      }
      this.stringifyStream.write(r);
    });
  }

  async shutdown(): Promise<void> {
    await new Promise((resolve, reject) => {
      this.stringifyStream.end(() => {
        resolve(undefined);
      });
    });
    logger.info('Ending CSV stream');
  }
}
