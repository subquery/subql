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
  constructor(private modelName: string, private outputPath: string) {
    const writeStream = fs.createWriteStream(this.getCsvFilePath(), {flags: 'a'});

    this.stringifyStream = stringify({header: !this.fileExist})
      .on('error', (err) => {
        logger.error(err, 'Failed to write to CSV');
        process.exit(1);
      })
      .on('data', (chunk) => {
        console.log('Received a chunk of data.', chunk.toString());
      });
    this.stringifyStream.pipe(writeStream);
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
      // this.stringifyStream.on('end', (resolver: ()=> void) => {
      //   console.log('ending stream', this.modelName)
      //   this.stringifyStream.on('finish', () => {
      //     console.log('finishing job', this.modelName)
      this.stringifyStream.end();
      this.stringifyStream.once('finish', () => {
        console.log('ending stream', this.modelName);
        this.stringifyStream.end();
      });
      //   })
      // })
      // this.stringifyStream.end(()=> {
      //   console.log('end called', this.modelName)
      // });

      // if (this.stringifyStream.writableFinished) {
      //   resolve();
      //   return;
      // }

      // Set up the listener for the 'finish' event
      // this.stringifyStream.on('finish', () => {
      //   console.log('Stream finished flushing');
      //   resolve();
      // });

      // End the stream
    });
  }
}
