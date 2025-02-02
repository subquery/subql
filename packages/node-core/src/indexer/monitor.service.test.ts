// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'fs';
import path from 'path';
import {makeTempDir} from '@subql/common';
import {NodeConfig} from '../configure';
import {MonitorService} from './monitor.service';

class testMonitorService extends MonitorService {
  testGetBlockIndexEntries(height: number) {
    return (this as any).getBlockIndexEntries(height);
  }

  testResetFile(file: 'A' | 'B') {
    return (this as any).resetFile(file);
  }

  testRemoveIndexFile() {
    fs.rmSync((this as any).indexPath);
  }

  testInit() {
    (this as any).init();
  }

  testWrite(blockData: string) {
    (this as any).write(blockData);
  }

  resetService() {
    (this as any)._cachedFileStats = undefined;
    (this as any)._currentFile = undefined;
    (this as any).currentIndexHeight = undefined;
  }
}

function removeLinesFromFile(filePath: string, startLine: number, endLine: number): void {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n');
    lines.splice(startLine - 1, endLine - startLine + 1);
    const updatedContent = lines.join('\n');
    fs.writeFileSync(filePath, updatedContent, 'utf-8');
    console.log(`Lines ${startLine}-${endLine} removed successfully from ${filePath}`);
  } catch (error) {
    console.error(`Error removing lines from file: ${error}`);
  }
}

describe('Monitor service', () => {
  let monitorDir: string;
  let monitorService1: testMonitorService;
  let nodeConfig: NodeConfig;
  beforeEach(async () => {
    monitorDir = await makeTempDir();
    nodeConfig = {monitorOutDir: monitorDir, monitorFileSize: 1024, dbSchema: 'test-db'} as NodeConfig;
    monitorService1 = new testMonitorService(nodeConfig);
    monitorService1.resetAll();
  });
  afterEach(() => {
    fs.rmSync(monitorDir, {recursive: true, force: true});
  });

  function mockWriteBlockData(blockHeight: number, monitorService: testMonitorService = monitorService1) {
    monitorService.createBlockStart(blockHeight);
    monitorService.testWrite(`fetch block ${blockHeight}`);
    monitorService.testWrite(`processing block ${blockHeight}`);
    monitorService.testWrite(`block handler ${blockHeight}`);
    monitorService.testWrite(`event handler ${blockHeight}, data :{entity: starter,{}}`);
    monitorService.testWrite('post process');
    monitorService.testWrite(`----- end block ${blockHeight}`);
  }

  it('monitor could write data', async () => {
    mockWriteBlockData(55);
    await expect(monitorService1.getBlockIndexRecords(55)).resolves.toContain('+++++ Start block 55');
    await expect(monitorService1.getBlockIndexRecords(55)).resolves.toContain('fetch block 55');
    await expect(monitorService1.getBlockIndexRecords(55)).resolves.toContain('----- end block 55');
  });

  it('reset file', () => {
    mockWriteBlockData(55);
    monitorService1.testResetFile('A');
    // should get nothing from entries
    expect(monitorService1.testGetBlockIndexEntries(55)).toStrictEqual([]);
  });

  it('when write one file is full, it could rotate to next file, and could getBlockIndexEntries, getBlockIndexRecords', async () => {
    const monitorService2 = new testMonitorService(nodeConfig);
    // set to small size, so it could rotate
    (monitorService2 as any).monitorFileSize = 150;
    const spySwitchFile = jest.spyOn(monitorService2 as any, 'switchToFile');

    const spyInitCacheFileStats = jest.spyOn(monitorService2 as any, 'initCacheFileStats');
    monitorService2.resetAll();
    const writeBlocks = [2, 5, 15, 25, 35, 55];
    for (const height of writeBlocks) {
      mockWriteBlockData(height, monitorService2);
    }
    expect(spySwitchFile).toHaveBeenCalledTimes(5);
    // rotate file many times, but FileStats should on been fetched once at init
    expect(spyInitCacheFileStats).toHaveBeenCalledTimes(1);

    // getBlockIndexEntries
    expect(monitorService2.testGetBlockIndexEntries(25)).toStrictEqual([]);
    expect(monitorService2.testGetBlockIndexEntries(35)).toStrictEqual([
      {
        blockHeight: 35,
        endLine: 5,
        file: 'A',
        forked: false,
        startLine: 0,
      },
    ]);
    expect(monitorService2.testGetBlockIndexEntries(55)).toStrictEqual(
      // return two indexes as switch files, start in file A, end in file B
      [
        {
          blockHeight: 55,
          endLine: 7,
          file: 'A',
          forked: false,
          startLine: 6,
        },
        {
          blockHeight: 55,
          endLine: 5,
          file: 'B',
          forked: false,
          startLine: 0,
        },
      ]
    );
    // getBlockIndexRecords
    await expect(monitorService2.getBlockIndexRecords(2)).resolves.toBeUndefined();
    await expect(monitorService2.getBlockIndexRecords(55)).resolves.toStrictEqual([
      '+++++ Start block 55',
      'fetch block 55',
      'processing block 55',
      'block handler 55',
      'event handler 55, data :{entity: starter,{}}',
      'post process',
      '----- end block 55',
    ]);
  });

  it('handle block forks happens', async () => {
    // set to small size, so it could rotate
    const monitorService2 = new testMonitorService(nodeConfig);
    monitorService2.resetAll();
    const beforeForkBlocks = [100, 105, 300];
    for (const height of beforeForkBlocks) {
      mockWriteBlockData(height, monitorService2);
    }
    monitorService2.createBlockFork(102);
    const afterForkBlocks = [103, 105, 109, 300];
    for (const height of afterForkBlocks) {
      mockWriteBlockData(height, monitorService2);
    }
    monitorService2.createBlockFork(200);
    await expect(monitorService2.getForkedRecords()).resolves.toStrictEqual([
      '***** Forked at block 102',
      '***** Forked at block 200',
    ]);
    expect(monitorService2.getBlockIndexHistory()).toStrictEqual(
      // block 300 continued to file B, but we only keep one record here
      [100, 105, 300, 'Forked 102', 103, 105, 109, 300, 'Forked 200']
    );
  });

  it('init validation failed it could reset by itself', () => {
    const monitorService2 = new testMonitorService(nodeConfig);
    const beforeForkBlocks = [100, 105, 300];
    for (const height of beforeForkBlocks) {
      mockWriteBlockData(height, monitorService2);
    }
    const spyResetAll = jest.spyOn(monitorService2, 'resetAll');
    // Case 1 .Mock index file is lost
    monitorService2.testRemoveIndexFile();
    monitorService2.testInit();
    expect(spyResetAll).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();
    // Case 2 .Mock last index record block file is lost
    // Rewrite some data first
    for (const height of beforeForkBlocks) {
      mockWriteBlockData(height, monitorService2);
    }
    const lastIndexEntries = monitorService2.testGetBlockIndexEntries(300);
    // Mock file lost
    fs.rmSync((monitorService2 as any).getFilePath(lastIndexEntries[lastIndexEntries.length - 1].file));
    monitorService2.testInit();
    expect(spyResetAll).toHaveBeenCalledTimes(1);
    jest.clearAllMocks();
    // Case 3 .Mock last index entry and corresponding file is found , but file is broken/missing records
    // Rewrite some data first
    for (const height of beforeForkBlocks) {
      mockWriteBlockData(height, monitorService2);
    }
    const block300Entry = monitorService2.testGetBlockIndexEntries(300)[0];
    // Mock lost block 300 record before init (We are not expect to loss any data during indexing, we can not handle this as file stats are cached)
    removeLinesFromFile(
      (monitorService2 as any).getFilePath(block300Entry.file),
      block300Entry.startLine,
      block300Entry.endLine
    );
    // Mock indexing stopped and cache cleared
    monitorService2.resetService();
    monitorService2.testInit();
    expect(spyResetAll).toHaveBeenCalledTimes(1);
  });

  it('should generate correct file path with sanitized dbSchema', () => {
    const expectedPath1 = path.join(monitorDir, 'test-db-fileA.txt');
    expect((monitorService1 as any).getFilePath('A')).toBe(expectedPath1);

    const nodeConfig2 = {
      monitorOutDir: monitorDir,
      monitorFileSize: 1024,
      dbSchema: 'd-1234/subquery/subquery-mainnet',
    } as NodeConfig;
    const monitorService2 = new testMonitorService(nodeConfig2);
    const expectedPath2 = path.join(monitorDir, 'd-1234-subquery-subquery-mainnet-fileA.txt');
    const indexPath = path.join(monitorDir, 'd-1234-subquery-subquery-mainnet-index.csv');
    expect((monitorService2 as any).getFilePath('A')).toBe(expectedPath2);
    expect((monitorService2 as any).indexPath).toBe(indexPath);
  });
});
