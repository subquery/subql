// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import * as fs from 'fs';
import path from 'path';
import * as readline from 'readline';
import {Injectable} from '@nestjs/common';
import {NodeConfig} from '../configure';
import {getLogger} from '../logger';
import {setMonitorService} from '../process';

const UNIT_MB = 1024 * 1024;

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
  endLine: number;
}

interface FileStat {
  fileSize: number;
  fileEndLine: number;
}

export interface MonitorServiceInterface {
  write(blockData: string): void;
  createBlockFork(blockHeight: number): void;
  createBlockStart(blockHeight: number): void;
}

@Injectable()
export class MonitorService implements MonitorServiceInterface {
  private readonly outputPath: string;
  private readonly monitorFileSize: number;
  private readonly indexPath: string;
  private _currentFile: keyof typeof FileLocation | undefined;
  private currentIndexHeight: number | undefined; // We need to keep this to update index when switch file, so we know current processing height
  private _cachedFileStats: Record<keyof typeof FileLocation, FileStat> | undefined;

  constructor(protected config: NodeConfig) {
    this.outputPath = config.monitorOutDir;
    this.monitorFileSize = config.monitorFileSize * UNIT_MB;
    this.indexPath = path.join(this.outputPath, `index.csv`);
    this.init();
    setMonitorService(this);
  }

  static forceClean(monitorDir: string): void {
    if (fs.existsSync(monitorDir)) {
      fs.rmSync(monitorDir, {recursive: true, force: true});
      logger.info('force cleaned monitor service files');
    }
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
    this._cachedFileStats = this.initCacheFileStats();
    this._currentFile = 'A';
  }

  get currentFile(): keyof typeof FileLocation {
    if (!this._currentFile) throw new Error(`Current write file is not defined`);
    return this._currentFile;
  }

  get cachedFileStats(): Record<keyof typeof FileLocation, FileStat> {
    if (this._cachedFileStats === undefined) {
      this._cachedFileStats = this.initCacheFileStats();
    }
    return this._cachedFileStats;
  }

  get currentFileSize(): number {
    return this.cachedFileStats[this.currentFile].fileSize;
  }

  set currentFileSize(number: number) {
    this.cachedFileStats[this.currentFile].fileSize = number;
  }

  get currentFileLastLine(): number {
    return this.cachedFileStats[this.currentFile].fileEndLine;
  }

  set currentFileLastLine(number: number) {
    this.cachedFileStats[this.currentFile].fileEndLine = number;
  }

  /**
   * Init service, also validate
   */
  private init(): void {
    if (this.monitorFileSize <= 0) {
      return;
    }
    if (!fs.existsSync(this.outputPath) || !fs.existsSync(this.indexPath)) {
      this.resetAll();
    } else {
      try {
        // `readLastIndexEntry` also include assertion to make sure endLine is valid
        const lastIndexEntry = this.readLastIndexEntry();
        // No index info been found, then reset
        if (lastIndexEntry === undefined) {
          throw new Error(`Last index entry is not found or incomplete`);
        } else if (!fs.existsSync(this.getFilePath(lastIndexEntry.file))) {
          throw new Error(
            `Last index entry point to file ${lastIndexEntry.file}, but not found under dir ${this.outputPath}`
          );
        } else {
          this._currentFile = lastIndexEntry.file;
        }
      } catch (e) {
        logger.error(`${e}, will try to reset monitor files`);
        this.resetAll();
      }
    }
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
    if (this.monitorFileSize <= 0) {
      return;
    }
    this.currentIndexHeight = blockHeight;
    this.write(`***** Forked at block ${blockHeight}`);
    this.updateIndex({
      blockHeight,
      startLine: this.currentFileLastLine,
      file: this.currentFile,
      forked: true,
    });
  }

  /**
   * create a record for block start
   * @param blockHeight
   */
  createBlockStart(blockHeight: number): void {
    if (this.monitorFileSize <= 0) {
      return;
    }
    this.currentIndexHeight = blockHeight;
    this.write(`+++++ Start block ${blockHeight}`);
    this.updateIndex({
      blockHeight,
      startLine: this.currentFileLastLine,
      file: this.currentFile,
      forked: false,
    });
  }

  /**
   * Write block record data to file
   * @param blockData
   */
  write(blockData: string): void {
    if (this.monitorFileSize <= 0) {
      return;
    }
    this.checkAndSwitchFile();
    const escapedBlockData = blockData.replace(/\n/g, '\\n');
    fs.appendFileSync(this.getFilePath(this.currentFile), `${escapedBlockData}\n`);
    this.currentFileSize += Buffer.byteLength(blockData) + 1; // + 1 for the new line
    this.currentFileLastLine += 1;
  }

  private initCacheFileStats(): Record<keyof typeof FileLocation, FileStat> {
    return {
      A: {
        fileSize: this.getFileSize('A'),
        fileEndLine: this.getGetNumberOfLines('A'),
      },
      B: {
        fileSize: this.getFileSize('B'),
        fileEndLine: this.getGetNumberOfLines('B'),
      },
    };
  }

  /**
   * By given a list of index entry (from index file), found corresponding block index records
   * @param indexEntries
   * @private
   */
  private async getRecordsWithEntries(indexEntries: IndexBlockEntry[]): Promise<string[] | undefined> {
    if (!indexEntries.length) {
      return undefined;
    }
    const records: string[] = [];
    for (const indexEntry of indexEntries) {
      const filePath = this.getFilePath(indexEntry.file);

      try {
        const fileStream = fs.createReadStream(filePath);
        const rl = readline.createInterface({
          input: fileStream,
          crlfDelay: Infinity,
        });

        let currentLine = 0;

        rl.on('line', (line) => {
          currentLine++;
          if (currentLine >= indexEntry.startLine && currentLine <= indexEntry.endLine) {
            records.push(line);
          }
          if (currentLine > indexEntry.endLine) {
            rl.close(); // Stop reading the file further
          }
        });

        await new Promise<void>((resolve, reject) => {
          rl.on('close', resolve);
          rl.on('error', reject);
          fileStream.on('error', reject);
        });
      } catch (error) {
        logger.error(`Error get block records in file ${filePath}:`, error);
        return undefined; // Or handle the error as needed
      }
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
            endLine = nextIndexBlockEntry.startLine - 1;
          }
          // not same, means file location has changed
          else {
            endLine = this.cachedFileStats[indexBlockEntry.file].fileEndLine;
          }
        } else {
          // Last index record in index file
          endLine = this.cachedFileStats[indexBlockEntry.file].fileEndLine;
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
      const endLine = this.cachedFileStats[indexEntry.file].fileEndLine;
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
      // return 0 for new file
      if (fileData === '') {
        return 0;
      }
      const lines = fileData.trim().split('\n');
      return lines.length;
    } catch (e) {
      throw new Error(`Get last line from given file ${file} failed, ${e}`);
    }
  }

  private checkAndSwitchFile(): void {
    if (this.currentFileSize >= this.monitorFileSize) {
      if (this.currentFile === 'A') {
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
    this._currentFile = file;
    this.currentFileSize = 0;
    this.currentFileLastLine = 0;
    this.updateIndex({blockHeight: this.currentIndexHeight, startLine: this.currentFileLastLine, file});
  }

  private createOrResetFile(filePath: string): void {
    fs.writeFileSync(filePath, '');
  }
}
