// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {
  BlockResponse,
  Connection,
  RpcResponseAndContext,
  SignatureStatus,
  TransactionResponse,
} from '@solana/web3.js';
import { SubqlSolanaTransactionFilter } from 'packages/types-solana/dist';
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

export function filterTransaction(
  transactions: TransactionResponse[],
  filters?: SubqlSolanaTransactionFilter,
): TransactionResponse[] {
  if (!filters || (filters instanceof Array && filters.length === 0)) {
    return transactions;
  }
  const filtersArray = filters instanceof Array ? filters : [filters];
  const filteredTransactions = transactions.filter(({ meta }: any) =>
    filtersArray.find(
      (filter) =>
        (filter.programId || filter.status) &&
        meta &&
        (filter.programId
          ? meta.logMessages &&
            !!meta.logMessages.find((msg) =>
              msg.match(new RegExp(filter.programId)),
            )
          : true) &&
        (filter.status
          ? Object.prototype.hasOwnProperty.call(meta.status, filter.status)
          : true),
    ),
  );
  return filteredTransactions;
}
