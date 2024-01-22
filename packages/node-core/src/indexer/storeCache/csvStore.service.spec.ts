// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'fs';
import path from 'path';
import {promisify} from 'util';
import rimraf from 'rimraf';
import {CsvStoreService} from './csvStore.service';

describe('csv Store Service', () => {
  const csvDirPath = path.join(__dirname, '../../../test/csv-test');
  const csvFilePath = path.join(csvDirPath, 'test-Test.csv');

  afterAll(async () => {
    await promisify(rimraf)(csvFilePath);
  });
  it('Able to export to csv with correct output, No duplicated headers', async () => {
    const csvStore = new CsvStoreService('Test', 'test', path.join(__dirname, '../../../test/csv-test'));

    await csvStore.export([
      {
        id: '1463-6',
        amount: 98746560n,
        blockNumber: 1463,
        date: '2020-05-26T18:03:24.000Z',
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
        date: '2020-05-26T18:03:24.000Z',
        fromId: '13gkdcmf2pxlw1mdctksezqf541ksy6mszfaehw5vftdpsxe',
        toId: '15zf7zvduiy2eycgn6kwbv2sjpdbsp6vdhs1ytzdgjrcsmhn',
        __block_range: {fn: 'int8range', args: [1463, null]},
      },
    ]);

    const csvFilePath = path.join(__dirname, '../../../test/csv-test', 'test-Test.csv');

    // Read the file after the export operation is complete
    const csv = await fs.promises.readFile(csvFilePath, 'utf-8');

    expect(csv).toEqual(
      `id,amount,blockNumber,date,fromId,toId,__block_range
1463-6,98746560,1463,2020-05-26T18:03:24.000Z,13gkdcmf2pxlw1mdctksezqf541ksy6mszfaehw5vftdpsxe,15zf7zvduiy2eycgn6kwbv2sjpdbsp6vdhs1ytzdgjrcsmhn,1463
1463-6,98746560,1463,2020-05-26T18:03:24.000Z,13gkdcmf2pxlw1mdctksezqf541ksy6mszfaehw5vftdpsxe,15zf7zvduiy2eycgn6kwbv2sjpdbsp6vdhs1ytzdgjrcsmhn,1463
`
    );
  });
  it('Date Mutation on csv', () => {
    // TODO
  });
  // TODO add test that goes through CachedModel.flush()
});
