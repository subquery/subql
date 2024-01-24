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
    if (!fs.existsSync(resolvedDir)) {
      throw new Error(`${this.outputPath} does not exist`);
    }
    if (!fs.lstatSync(resolvedDir).isDirectory()) {
      throw new Error(`${this.outputPath} is not a directory`);
    }

    const filePath = path.join(resolvedDir, `${this.modelName}.csv`);
    this.fileExist = fs.existsSync(filePath);
    return filePath;
  }
  async export(records: any[]): Promise<void> {
    await Promise.all(
      records
        .map((r: any) => {
          // remove store
          const {__block_range, store, ...orgRecord} = r;
          if (__block_range !== undefined) {
            return {
              ...orgRecord,
              __block_number: r.blockNumber,
            };
          }
          return orgRecord;
        })
        .map((r) => {
          return new Promise((resolve, reject) => {
            this.stringifyStream.write(r, (error) => {
              if (error) {
                reject(error);
              } else {
                resolve(undefined);
              }
            });
          });
        })
    );
  }

  async shutdown(): Promise<void> {
    return new Promise((resolve) => {
      this.writeStream.once('finish', () => {
        logger.info(`Ending CSV write stream, ${this.modelName}`);
        resolve();
      });

      this.stringifyStream.end();
      logger.info(`${this.modelName} CSV Stream ended`);
    });
  }
}
