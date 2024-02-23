// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {IBlock} from '@subql/types-core';
import {mergeNumAndBlocks, mergeNumAndBlocksToNums} from './utils';

function mockIblock(n: number): IBlock<{height: number; hash: string}> {
  return {
    getHeader: () => {
      return {height: n, parentHash: `0x${n - 1}`, hash: `0x${n}`};
    },
    block: {height: n, hash: `0x${n}`},
  };
}

const outcomeBlocks = [
  10,
  mockIblock(12),
  mockIblock(20),
  mockIblock(22),
  mockIblock(23),
  30,
  40,
  mockIblock(44),
  mockIblock(45),
  mockIblock(50),
];
const outcomeBlocks2 = [10, 12, 20, 22, 23, 30, 40, 44, 45, 50];

it('mergeNumAndBlocks, merge and arrange blocks in order', () => {
  const moduloBlocks = [10, 20, 30, 40, 50];

  const batchBlocks: IBlock<any>[] = [
    // should keep these fat blocks rather than number, so we don't have to fetch again
    mockIblock(50),
    mockIblock(12),
    mockIblock(22),
    mockIblock(23),
    mockIblock(44),
    mockIblock(45),
    // and it can order
    mockIblock(20),
    // and it can remove duplicate
    mockIblock(22),
  ];

  expect(JSON.stringify(mergeNumAndBlocks(moduloBlocks, batchBlocks))).toBe(JSON.stringify(outcomeBlocks));
  // also should work if batchBlocks is numbers
  const batchBlocks2 = [12, 22, 23, 44, 45, 22];
  expect(mergeNumAndBlocks(moduloBlocks, batchBlocks2)).toEqual(outcomeBlocks2);
});

it('mergeNumAndBlocksToNums, turn all blocks into number', () => {
  const moduloBlocks = [10, 20, 30, 40, 50];

  function mockIblock(n: number): IBlock<{height: number; hash: string}> {
    return {
      getHeader: () => {
        return {height: n, parentHash: `0x${n - 1}`, hash: `0x${n}`};
      },
      block: {height: n, hash: `0x${n}`},
    };
  }

  const batchBlocks: IBlock<any>[] = [
    // should keep these fat blocks rather than number, so we don't have to fetch again
    mockIblock(50),
    mockIblock(12),
    mockIblock(22),
    mockIblock(23),
    mockIblock(44),
    mockIblock(45),
    // and it can order
    mockIblock(20),
    // and it can remove duplicate
    mockIblock(22),
  ];
  expect(mergeNumAndBlocksToNums(moduloBlocks, batchBlocks)).toEqual(outcomeBlocks2);
  // also should work if batchBlocks is numbers
  const batchBlocks2 = [12, 22, 23, 44, 45, 22];
  expect(mergeNumAndBlocksToNums(moduloBlocks, batchBlocks2)).toEqual(outcomeBlocks2);
});
