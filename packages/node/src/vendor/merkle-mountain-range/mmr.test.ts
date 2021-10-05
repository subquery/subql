// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import crypto from 'crypto';
import path from 'path';
import { promisify } from 'util';
import {
  MMR,
  keccak256FlyHash,
  FileBasedDb,
} from '@subql/x-merkle-mountain-range';
import rimraf from 'rimraf';

describe('Mmr test ', () => {
  const projectMmrPath = path.join(__dirname, `./mmrs/test.mmr`);

  afterAll(async () => {
    await promisify(rimraf)(projectMmrPath);
  });

  it('oepn or create fd mmr, and append', async () => {
    const fileBasedDb = FileBasedDb.openOrCreate(projectMmrPath, `as+`, 64);
    const fileBasedMmr = new MMR(keccak256FlyHash, fileBasedDb);
    console.log(keccak256FlyHash);
    let nodeLength = await fileBasedMmr.getNodeLength();
    let leafLength = await fileBasedMmr.getLeafLength();
    console.log(`node length: ${nodeLength}`);
    console.log(`leaf length: ${leafLength}`);
    for (let i = leafLength; i < leafLength + 10; i++) {
      const leaf = crypto.randomBytes(64);
      await fileBasedMmr.append(leaf, i);
    }
    nodeLength = await fileBasedMmr.getNodeLength();
    leafLength = await fileBasedMmr.getLeafLength();
    console.log(`After append: node length: ${nodeLength}`);
    console.log(`After append: leaf length: ${leafLength}`);
    const lastLeaf = await fileBasedMmr.db.get(
      MMR.getNodePosition(leafLength - 1).i,
    );
    console.log(`Last leaf ${lastLeaf.toString('hex')}`);
  }, 50000);

  it('after appen still can get info of project mmr', async () => {
    const fileBasedDb = FileBasedDb.open(projectMmrPath);
    const fileBasedMmr = new MMR(keccak256FlyHash, fileBasedDb);
    const nodeLength = await fileBasedMmr.getNodeLength();
    const leafLength = await fileBasedMmr.getLeafLength();
    console.log(`node length: ${nodeLength}`);
    console.log(`leaf length: ${leafLength}`);
  }, 500000);
});
