// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'fs';
import path from 'path';
import {Stringifier, stringify} from 'csv-stringify';
import {getLogger} from '../../../logger';
import {exitWithError} from '../../../process';
import {BaseEntity} from '../model';
import {Exporter} from './exporter';

const logger = getLogger('CsvStore');
export class CsvExporter<T extends BaseEntity = BaseEntity> implements Exporter<T> {
  private fileExist?: boolean;
  private stringifyStream: Stringifier;
  private readonly writeStream: fs.WriteStream;

  constructor(
    private modelName: string,
    private outputPath: string
  ) {
    this.writeStream = fs.createWriteStream(this.getCsvFilePath(), {flags: 'a'});

    this.stringifyStream = stringify({header: !this.fileExist}).on('error', (err) => {
      exitWithError(new Error(`Failed to write to CSV`, err), logger);
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

  private async write(r: Omit<T, '__block_range'> & {blockNumber?: number}): Promise<void> {
    return new Promise((resolve, reject) => {
      this.stringifyStream.write(r, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve(undefined);
        }
      });
    });
  }

  private blockRangeToBlockNumber(input: T['__block_range']): number | undefined {
    if (!input) return undefined;

    if (Array.isArray(input)) {
      return input[0] ?? undefined;
    }

    if ((input as any).fn === 'int8range') {
      return (input as any).args[0];
    }
  }

  async export(records: T[]): Promise<void> {
    await Promise.all(
      records
        .map((r) => {
          const {__block_range, ...orgRecord} = r;
          if (__block_range !== undefined) {
            return {
              ...orgRecord,
              __block_number: this.blockRangeToBlockNumber(__block_range),
            };
          }
          return orgRecord;
        })
        .map((r) => this.write(r))
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
