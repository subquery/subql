// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'fs';
import path from 'path';
import {rimraf} from 'rimraf';
import {CsvStoreService} from './csvStore.service';

describe('csv Store Service', () => {
  const csvDirPath = path.join(__dirname, '../../../test/csv-test');

  beforeAll(async () => {
    await fs.promises.mkdir(csvDirPath);
  });

  afterAll(async () => {
    await rimraf(csvDirPath);
  });
  it('Able to export to csv with correct output, No duplicated headers', async () => {
    const csvFilePath1 = path.join(csvDirPath, 'Test.csv');

    const csvStore = new CsvStoreService('Test', csvDirPath);

    await csvStore.export([
      {
        id: '1463-6',
        amount: 98746560n,
        blockNumber: 1463,
        date: new Date('2020-05-26T18:03:24.000Z'),
        fromId: '13gkdcmf2pxlw1mdctksezqf541ksy6mszfaehw5vftdpsxe',
        toId: '15zf7zvduiy2eycgn6kwbv2sjpdbsp6vdhs1ytzdgjrcsmhn',
        __block_range: {fn: 'int8range', args: [1463, null]},
      },
    ]);

    await csvStore.export([
      {
        id: '1463-6',
        amount: 98746560n,
        blockNumber: 1463,
        date: new Date('2020-05-26T18:03:24.000Z'),
        fromId: '13gkdcmf2pxlw1mdctksezqf541ksy6mszfaehw5vftdpsxe',
        toId: '15zf7zvduiy2eycgn6kwbv2sjpdbsp6vdhs1ytzdgjrcsmhn',
        __block_range: {fn: 'int8range', args: [1463, null]},
      },
    ]);

    await csvStore.shutdown();

    // Read the file after the export operation is complete
    const csv = await fs.promises.readFile(csvFilePath1, 'utf-8');

    expect(csv).toEqual(
      `id,amount,blockNumber,date,fromId,toId,__block_number
1463-6,98746560,1463,1590516204000,13gkdcmf2pxlw1mdctksezqf541ksy6mszfaehw5vftdpsxe,15zf7zvduiy2eycgn6kwbv2sjpdbsp6vdhs1ytzdgjrcsmhn,1463
1463-6,98746560,1463,1590516204000,13gkdcmf2pxlw1mdctksezqf541ksy6mszfaehw5vftdpsxe,15zf7zvduiy2eycgn6kwbv2sjpdbsp6vdhs1ytzdgjrcsmhn,1463
`
    );
  });
  it('JSON serialisation', async () => {
    const csvFilePath2 = path.join(csvDirPath, 'JsonTest.csv');

    const csvStore = new CsvStoreService('JsonTest', csvDirPath);

    await csvStore.export([
      {
        id: '1463-6',
        amount: 98746560n,
        blockNumber: 1463,
        jsonField: {field1: 'string', field2: 2, nestedJson: {foo: 'bar'}},
      },
    ]);

    await csvStore.shutdown();
    const csv = await fs.promises.readFile(csvFilePath2, 'utf-8');
    expect(csv).toEqual(
      `id,amount,blockNumber,jsonField
1463-6,98746560,1463,"{""field1"":""string"",""field2"":2,""nestedJson"":{""foo"":""bar""}}"
`
    );
  });
});
