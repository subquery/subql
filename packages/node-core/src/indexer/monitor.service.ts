// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import * as fs from 'fs';
import path from 'path';
import * as readline from 'readline';
import {getLogger, NodeConfig} from '@subql/node-core';

const DEFAULT_MONITOR_STORE_PATH = './.monitor'; // Provide a default path if needed
const UNIT_MB = 1024 * 1024;
const FILE_LIMIT_SIZE = 50 * UNIT_MB; // 50 MB in bytes

const logger = getLogger('Monitor');

enum FileLocation {
  'A' = 'fileA.txt',
  'B' = 'fileB.txt',
}

interface IndexEntry {
  blockHeight: number;
  startLine: number;
  file: keyof typeof FileLocation; // 'A' or 'B' for fileAPath and fileBPath respectively
  forked?: boolean;
}

interface IndexBlockEntry extends IndexEntry {
  endLine?: number;
}

export class MonitorService {
  private readonly outputPath: string;
  private readonly monitorFileSize: number;
  private readonly indexPath: string;
  private _currentFile: string | undefined;
  private _lastLine: number | undefined;
  private currentFileSize = 0;
  private currentIndexHeight: number | undefined; // We need to keep this to update index when switch file, so we know current processing height

  constructor(nodeConfig: NodeConfig) {
    this.outputPath = nodeConfig.monitorOutDir ?? DEFAULT_MONITOR_STORE_PATH;
    this.monitorFileSize = nodeConfig.monitorFileSize ? nodeConfig.monitorFileSize * UNIT_MB : FILE_LIMIT_SIZE;
    this.indexPath = path.join(this.outputPath, `index.csv`);
  }

  get currentFile(): string {
    if (!this._currentFile) throw new Error(`Current write file is not defined`);
    return this._currentFile;
  }

  // maybe a good idea to expose this, if error didn't be caught api could still use reset
  /**
   * Reset all files and memory values
   */
  resetAll(): void {
    fs.mkdirSync(this.outputPath, {recursive: true});
    this.createOrResetFile(this.getFilePath('A'));
    this.createOrResetFile(this.getFilePath('B'));
    this.createOrResetFile(this.indexPath);
    this._currentFile = this.getFilePath('A');
    this._lastLine = 0;
    this.currentFileSize = 0;
  }

  /**
   * Init service, also validate
   */
  async init(): Promise<void> {
    if (!fs.existsSync(this.outputPath) || !fs.existsSync(this.indexPath)) {
      this.resetAll();
    } else {
      try {
        const lastIndexEntry = this.readLastIndexEntry();
        // No index info been found, then reset
        if (lastIndexEntry === undefined) {
          this.resetAll();
          logger.warn(`Reset as last index entry is not found or incomplete`);
        } else {
          const blockRecords = await this.getBlockIndexRecords(lastIndexEntry.blockHeight);
          if (blockRecords === undefined) {
            throw new Error(
              `Last index point to block ${lastIndexEntry.blockHeight}, but didn't find in corresponding file ${lastIndexEntry.file}`
            );
          }
          // Set current file and last line to current file's end line
          this._currentFile = this.getFilePath(lastIndexEntry.file);
          this._lastLine = lastIndexEntry.endLine;
          // We could still compare lastLine record is matching with last value in blockRecords
          this.currentFileSize = this.getFileSize(lastIndexEntry.file);
        }
      } catch (e) {
        logger.error(`${e}, will try to reset monitor files`);
        this.resetAll();
      }
    }
  }

  /**
   * Return last line in current file, if not found in memory, will find in the last index pointed file
   */
  get lastLine(): number {
    if (this._lastLine === undefined) {
      const lastIndexInfo = this.readLastIndexEntry();
      if (lastIndexInfo?.endLine === undefined) {
        throw new Error(`Expect could read last line from index and current file`);
      }
      this._lastLine = lastIndexInfo.endLine;
    }
    return this._lastLine;
  }

  // To human-readable block history，still experimental, this can be more friendly
  getBlockIndexHistory(): (number | string)[] {
    const mixedArray: (number | string)[] = [];
    const indexEntries = this.getAllIndexEntries();
    indexEntries.forEach((entry) => {
      if (entry.forked) {
        mixedArray.push(`Forked ${entry.blockHeight}`);
      } else {
        // Skip this block height, treat it as 2nd index of same block but in another file
        if (entry.startLine === 0 && mixedArray[mixedArray.length - 1] === entry.blockHeight) {
          return;
        }
        mixedArray.push(entry.blockHeight);
      }
    });
    return mixedArray;
  }

  /**
   * Get all forked heights and records
   */
  async getForkedRecords(): Promise<string[] | undefined> {
    const forkedEntries = this.getForkedEntries();
    return this.getRecordsWithEntries(forkedEntries);
  }

  /**
   *  Get block height index records
   * @param blockHeight
   */
  async getBlockIndexRecords(blockHeight: number): Promise<string[] | undefined> {
    const indexEntries = this.getBlockIndexEntries(blockHeight);
    return this.getRecordsWithEntries(indexEntries);
  }

  /**
   * create a record for fork
   * @param blockHeight
   */
  createBlockFork(blockHeight: number): void {
    this.currentIndexHeight = blockHeight;
    this.write(`***** Forked at block ${blockHeight}`);
    this.updateIndex({
      blockHeight,
      startLine: this.lastLine,
      file: this.currentFile === this.getFilePath('A') ? 'A' : 'B',
      forked: true,
    });
  }

  /**
   * create a record for block start
   * @param blockHeight
   */
  createBlockStart(blockHeight: number): void {
    this.currentIndexHeight = blockHeight;
    this.write(`+++++ Start block ${blockHeight}`);
    this.updateIndex({
      blockHeight,
      startLine: this.lastLine,
      file: this.currentFile === this.getFilePath('A') ? 'A' : 'B',
      forked: false,
    });
  }

  /**
   * Write block record data to file
   * @param blockData
   */
  write(blockData: string): void {
    this.checkAndSwitchFile();
    const escapedBlockData = blockData.replace(/\n/g, '\\n');
    fs.appendFileSync(this.currentFile, `${escapedBlockData}\n`);
    this.currentFileSize += Buffer.byteLength(blockData) + 1;
    if (this._lastLine === undefined) {
      this._lastLine = this.lastLine;
    }
    this._lastLine += 1;
  }

  /**
   * By given a list of index entry (from index file), found corresponding block index records
   * @param indexEntries
   * @private
   */
  private async getRecordsWithEntries(indexEntries: IndexBlockEntry[]): Promise<string[] | undefined> {
    const records: string[] = [];
    if (!indexEntries.length) {
      return undefined;
    }

    for (const indexEntry of indexEntries) {
      const filePath = this.getFilePath(indexEntry.file);

      const fileStream = fs.createReadStream(filePath);
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      });

      let currentLine = 0;

      rl.on('line', (line) => {
        if (indexEntry.endLine === undefined) {
          throw new Error(`end line in indexEntry is expect to be defined`);
        }
        currentLine++;
        if (currentLine >= indexEntry.startLine && currentLine <= indexEntry.endLine) {
          records.push(line);
        }
        if (currentLine > indexEntry.endLine) {
          rl.close(); // Stop reading the file further
        }
      });

      await new Promise((resolve) => rl.on('close', resolve)); // Wait until reading is done
    }

    return records;
  }

  /**
   * Get all index entries
   * @private
   */
  private getAllIndexEntries(): IndexEntry[] {
    const indexData = fs.readFileSync(this.indexPath, 'utf-8');
    const data = indexData.trim().split('\n');
    return data.map((d) => this.decodeIndexRow(d));
  }

  private getForkedEntries(): IndexBlockEntry[] {
    const results: IndexBlockEntry[] = [];
    const indexEntries = this.getAllIndexEntries();
    indexEntries.forEach((entry) => {
      if (entry.forked) {
        results.push({...entry, endLine: entry.startLine});
      }
    });
    return results;
  }

  private getBlockIndexEntries(blockHeight: number): IndexBlockEntry[] {
    const results: IndexBlockEntry[] = [];
    const indexData = fs.readFileSync(this.indexPath, 'utf-8');
    const data = indexData.trim().split('\n');
    for (let i = 0; i < data.length; i++) {
      const indexBlockEntry = this.decodeIndexRow(data[i]);
      if (indexBlockEntry.blockHeight === blockHeight) {
        let endLine: number | undefined;
        const nextIndex = i + 1;
        if (nextIndex < data.length) {
          const nextIndexBlockEntry = this.decodeIndexRow(data[nextIndex]);
          // If next entry are in same file, then we can calculate current index endline
          if (indexBlockEntry.file === nextIndexBlockEntry.file) {
            endLine = nextIndexBlockEntry.blockHeight - 1;
          }
          // not same, means file location has changed
          else {
            endLine = this.getGetNumberOfLines(indexBlockEntry.file);
          }
        } else {
          // This is indexBlockEntry is the last record
          endLine = this.getGetNumberOfLines(indexBlockEntry.file);
        }
        results?.push({...indexBlockEntry, endLine});
      }
    }
    return results;
  }

  /**
   * Read last index, and return IndexBlockInfo, if no record, return undefined
   * @private
   */
  private readLastIndexEntry(): IndexBlockEntry | undefined {
    try {
      const indexData = fs.readFileSync(this.indexPath, 'utf-8');
      const rows = indexData.trim().split('\n');
      if (!rows || rows[0] === '') {
        return undefined;
      }
      const lastRow = rows[rows.length - 1];
      const indexEntry = this.decodeIndexRow(lastRow);
      const endLine = this.getGetNumberOfLines(indexEntry.file);
      if (endLine < indexEntry.startLine) {
        throw new Error(
          `Expect last entry record block ${indexEntry.blockHeight}, in file ${indexEntry.file} start from line ${indexEntry.startLine}, but last line in file is ${endLine} `
        );
      }
      return {...indexEntry, endLine};
    } catch (error) {
      // Error will be handled in higher level with undefined result
      logger.error(`Error read last index entry : ${error}`);
    }
    return undefined;
  }

  private resetFile(file: keyof typeof FileLocation): void {
    const backupIndexPath = `${this.indexPath}.bak`;
    try {
      // Backup the original index file
      const backupContent = fs.readFileSync(this.indexPath, 'utf-8');
      fs.writeFileSync(backupIndexPath, backupContent, 'utf-8');
      this.removeIndexEntriesByFile(file);
    } catch (e) {
      // Rollback by restoring the backup
      const backupContent = fs.readFileSync(backupIndexPath, 'utf-8');
      fs.writeFileSync(this.indexPath, backupContent, 'utf-8');
      fs.rmSync(backupIndexPath);
      throw new Error(`Error during index removal: ${e}`);
    }
    // Only remove file when index is successful removed
    fs.rmSync(this.getFilePath(file));
    fs.rmSync(backupIndexPath);
    this.createOrResetFile(this.getFilePath(file));
  }

  private getFileSize(file: keyof typeof FileLocation): number {
    const filePath = this.getFilePath(file);
    const stats = fs.statSync(filePath);
    return stats.size;
  }

  private getFilePath(file: keyof typeof FileLocation): string {
    return path.join(this.outputPath, FileLocation[file]);
  }

  private updateIndex(indexEntry: IndexEntry): void {
    const csvLine = `${indexEntry.blockHeight},${indexEntry.startLine},${indexEntry.file},${
      indexEntry.forked ? '*' : ''
    }\n`;
    fs.appendFileSync(this.indexPath, csvLine); // Append the index entry to the CSV file
  }

  private removeIndexEntriesByFile(file: keyof typeof FileLocation): void {
    const fileContent = fs.readFileSync(this.indexPath, 'utf-8');
    const rows = fileContent.split('\n');
    const filteredRows = rows.filter((line) => {
      const [, , fileLocationStr] = line.split(',');
      return fileLocationStr !== file;
    });
    const filteredContent = filteredRows.join('\n');
    fs.writeFileSync(this.indexPath, filteredContent, 'utf-8');
  }

  private decodeIndexRow(row: string): IndexEntry {
    const [entryBlockHeightStr, startLineStr, fileLocationStr, forkedStr] = row.split(',');
    const file = fileLocationStr as keyof typeof FileLocation;
    return {
      blockHeight: parseInt(entryBlockHeightStr),
      startLine: parseInt(startLineStr),
      file,
      forked: forkedStr === '*',
    };
  }

  // this is expecting to be found, as given file is from index entry
  // if unmatched is found, it will throw from here.
  private getGetNumberOfLines(file: keyof typeof FileLocation): number {
    try {
      const filePath = this.getFilePath(file);
      const fileData = fs.readFileSync(filePath, 'utf-8');
      const lines = fileData.trim().split('\n');
      return lines.length;
    } catch (e) {
      throw new Error(`Get last line from given file ${file} failed, ${e}`);
    }
  }

  private checkAndSwitchFile(): void {
    if (this.currentFileSize >= this.monitorFileSize) {
      if (this.currentFile === this.getFilePath('A')) {
        this.switchToFile('B');
      } else {
        this.switchToFile('A');
      }
    }
  }

  private switchToFile(file: keyof typeof FileLocation): void {
    logger.debug(`Switch to file ${file}`);
    if (this.currentIndexHeight === undefined) {
      throw new Error(`Switch to new file but current index height is not defined`);
    }
    this.resetFile(file);
    this._currentFile = this.getFilePath(file);
    this.currentFileSize = 0;
    this._lastLine = 0;
    this.updateIndex({blockHeight: this.currentIndexHeight, startLine: this.lastLine, file});
  }

  private createOrResetFile(filePath: string): void {
    fs.writeFileSync(filePath, '');
  }
}
