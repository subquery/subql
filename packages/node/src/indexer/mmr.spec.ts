// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { hexToU8a, u8aEq, u8aToHex } from '@polkadot/util';
import {
  MMR,
  FileBasedDb,
  keccak256FlyHash,
} from '@subql/x-merkle-mountain-range';

const newLeaf = Buffer.from(
  '0000000000000000000000000000000000000000000000000000000000000001',
  'hex',
);

const projectMmrPath =
  '../../.mmr/QmTQTnBTcvv3Eb3M6neDiwuubWVDAoqyAgKmXtTtJKAHoH.mmr';

const fileBasedDb = FileBasedDb.open(projectMmrPath);
const fileBasedMmr = new MMR(keccak256FlyHash, fileBasedDb);

describe('mmr check', () => {
  it('read mmr leafs', async () => {
    const nextLeafIndex = await fileBasedMmr.getLeafLength();
    const mmrRoot = await fileBasedMmr.getRoot(4791);
    console.log(u8aToHex(mmrRoot));
    console.log(nextLeafIndex);
    await fileBasedMmr.append(newLeaf, nextLeafIndex);

    const newMmrRoot = await fileBasedMmr.getRoot(nextLeafIndex);

    console.log(u8aToHex(mmrRoot));

    // for(let i = 11990; i < 11995; i++){
    //   const mmrRoot = await fileBasedMmr.getRoot(i);
    //
    //   console.log(u8aToHex(mmrRoot));
    // }
  });

  it('reset with index', async () => {
    await fileBasedMmr.delete(5000);
    const currentLength = await fileBasedMmr.getLeafLength();

    console.log(currentLength);
  });
});
