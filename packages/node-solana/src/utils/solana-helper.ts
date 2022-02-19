// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {BlockResponse, ConfirmedBlock, Connection, RpcResponseAndContext, SignatureStatus} from "@solana/web3.js";
import {SubqlSolanaEventFilter} from '@subql/types-solana';
import {BlockContent} from '../indexer/types';
import {getLogger} from './logger';

const logger = getLogger('fetch');

async function getBlockByHeight(api: Connection, height: number) {
  return api.getBlock(height).catch((e) => {
    logger.error(`failed to fetch Block ${height}`);
    throw e;
  });
}

export async function fetchSolanaBlocksArray(
  api: Connection,
  blockArray: number[],
): Promise<BlockResponse[]> {
  return Promise.all(
    blockArray.map(async (height) => getBlockByHeight(api, height)),
  );
}

export async function getTxInfobyHashes(
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
  return blocks.map(
    (blockInfo) => {
      return {
        block: {
          block: blockInfo
        }
      } as unknown as BlockContent
    },
  );
}
