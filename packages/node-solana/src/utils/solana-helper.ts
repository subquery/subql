// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {
  BlockResponse,
  Connection,
  RpcResponseAndContext,
  SignatureStatus,
} from '@solana/web3.js';
import { BlockContent } from '../indexer/types';
import { getLogger } from './logger';

const logger = getLogger('fetch');

async function getBlockByHeight(api: Connection, height: number) {
  let res;
  res = await api.getBlock(height).catch((e) => {
    logger.error(e, `failed to fetch Block ${height}`);
    // throw e;
    res = null;
  });
  return res;
}

export async function fetchSolanaBlocksArray(
  api: Connection,
  blockArray: number[],
): Promise<(BlockResponse | void)[]> {
  const res = await Promise.all(
    blockArray.map(async (height) => getBlockByHeight(api, height)),
  );
  return res.filter((r) => r !== null);
}

export async function getTxInfoByHashes(
  api: Connection,
  txHashes: string[],
): Promise<RpcResponseAndContext<SignatureStatus>[]> {
  return Promise.all(
    txHashes.map(async (hash) => {
      return api.getSignatureStatus(hash);
    }),
  );
}

export async function fetchSolanaBlocksBatches(
  api: Connection,
  blockArray: number[],
): Promise<BlockContent[]> {
  const blocks = await fetchSolanaBlocksArray(api, blockArray);
  return blocks.map((blockInfo) => {
    return {
      block: {
        block: blockInfo,
      },
    } as unknown as BlockContent;
  });
}
