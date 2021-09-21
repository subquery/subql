// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

// overwrite the official: https://github.com/zmitton/merkle-mountain-range/blob/master/src/db/fileBasedDb.js
// fix the set leaf length, and enhance create method

import fileSystem from 'fs';
import path from 'path';

// The fist 16 bytes of any fileBasedDb (`.mmr`) file contain the wordSize and the leafLength respectively. For
// instance 0000 0000 0000 0040 0000 0000 0000 03e8 is a db with wordsize 64 and leafLength 1000.

export class FileBasedDb {
  fd: any;
  filePath: string;
  _wordSize: number;

  constructor() {
    throw new Error(
      'Please use the static `create` and `open` methods to construct a FileBasedDB',
    );
  }
  static create(filePath, wordSize = 64) {
    // throws if file already exists
    return this.openOrCreate(filePath, 'as+', wordSize);
  }
  static open(filePath) {
    // throws if file does not exist
    return this.openOrCreate(filePath, 'r+');
  }
  static openOrCreate(filePath, fileSystemFlags, wordSize?) {
    const db = Object.create(this.prototype);
    db.filePath = filePath;
    const dirname = path.dirname(filePath);
    if (!fileSystem.existsSync(dirname)) {
      fileSystem.mkdirSync(dirname);
    }
    db.fd = fileSystem.openSync(filePath, fileSystemFlags);
    if (wordSize) {
      db._setWordSize(wordSize);
    }
    return db;
  }

  async get(_index) {
    const index = _index + 1; // shift 1 because index zero holds meta-data (wordSize and leafLength)
    const wordSize = await this._getWordSize();
    const indexToFirstByte = index * wordSize;
    const chunk = Buffer.alloc(wordSize);
    return new Promise((resolve, reject) => {
      fileSystem.read(this.fd, chunk, 0, wordSize, indexToFirstByte, (e, r) => {
        if (e) {
          reject(e);
        } else {
          if (chunk.equals(Buffer.alloc(wordSize))) {
            resolve(null);
          } else {
            resolve(chunk);
          }
        }
      });
    });
  }
  async set(value, index) {
    const wordSize = await this._getWordSize();
    if (value === undefined || Buffer.alloc(wordSize).equals(value)) {
      throw new Error('Can not set nodeValue as an empty buffer');
    }
    // await promisify(fileSystem.write)(this.fd, value, 0, wordSize, ((index + 1) * wordSize));
    // fileSystem.writeSync(this.fd, value, 0, wordSize, ((index + 1) * wordSize));
    // console.log(`complete write node index ${index}`)
    return new Promise((resolve, reject) => {
      fileSystem.write(
        this.fd,
        value,
        0,
        wordSize,
        (index + 1) * wordSize,
        (e, r) => {
          if (e) {
            reject(e);
          } else {
            resolve(r);
          }
        },
      );
    });
  }

  async getLeafLength() {
    const leafLengthBuffer = Buffer.alloc(4);
    return new Promise((resolve, reject) => {
      fileSystem.read(this.fd, leafLengthBuffer, 0, 4, 12, (e, r) => {
        if (e) {
          reject(e);
        } else {
          resolve(leafLengthBuffer.readUInt32BE(0));
        }
      });
    });
  }

  async setLeafLength(leafLength) {
    // to do: deallocate the deleted part of the file
    const lengthBuffer = Buffer.alloc(4);
    lengthBuffer.writeUInt32BE(leafLength, 0);
    return new Promise((resolve, reject) => {
      fileSystem.write(this.fd, lengthBuffer, 0, 4, 12, (e, r) => {
        if (e) {
          reject(e);
        } else {
          fileSystem.fsync(this.fd, (e) => {
            if (e) {
              reject(e);
            } else {
              resolve(r);
            }
          });
        }
      });
    });
  }
  async getNodes() {
    const wordSize = await this._getWordSize();
    const stats = fileSystem.statSync(this.filePath);
    const nodeLength = (stats.size - wordSize) / wordSize;

    const nodes = {};
    for (let i = 0; i < nodeLength; i++) {
      nodes[i] = await this.get(i);
    }
    return nodes;
  }
  _setWordSize(wordSize) {
    if (!wordSize || wordSize < 16) {
      throw new Error(`Wordsize of${wordSize}not supported for FileBasedDB`);
    }
    const wordSizeBuffer = Buffer.alloc(16);
    wordSizeBuffer.writeUInt32BE(wordSize, 4);
    fileSystem.writeSync(this.fd, wordSizeBuffer, 0, 16, 0);
  }
  async _getWordSize(): Promise<number> {
    if (!this._wordSize) {
      const wordSizeBuffer = Buffer.alloc(4);
      return new Promise((resolve, reject) => {
        fileSystem.read(this.fd, wordSizeBuffer, 0, 4, 4, (e, r) => {
          if (e) {
            reject(e);
          } else {
            if (wordSizeBuffer.equals(Buffer.alloc(4))) {
              reject(new Error(`Db has undefined wordSize${wordSizeBuffer}`));
            } else {
              this._wordSize = wordSizeBuffer.readUInt32BE(0);
              resolve(this._wordSize);
            }
          }
        });
      });
    }
    return this._wordSize;
  }
}
