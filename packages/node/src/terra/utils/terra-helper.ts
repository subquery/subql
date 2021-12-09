import {
  BlockInfo,
  EventsByType,
  hashToHex,
  LCDClient,
  TxInfo,
  TxLog,
} from '@terra-money/terra.js';
import { TerraBlockContent } from '../indexer/types';
import { getLogger } from './logger';

const logger = getLogger('fetch');

async function getBlockByHeight(api: LCDClient, height: number) {
  return api.tendermint.blockInfo(height).catch((e) => {
    logger.error(`failed to fetch Block ${height}`);
    throw e;
  });
}

export async function fetchTerraBlocksArray(
  api: LCDClient,
  blockArray: number[],
): Promise<BlockInfo[]> {
  return Promise.all(
    blockArray.map(async (height) => getBlockByHeight(api, height)),
  );
}

export async function getTxInfobyHashes(
  api: LCDClient,
  txHashes: string[],
): Promise<TxInfo[]> {
  return Promise.all(
    txHashes.map(async (hash) => {
      //console.log(hashToHex(hash))
      return api.tx.txInfo(hashToHex(hash));
    }),
  );
}

export async function getEventsByTypeFromBlock(
  api: LCDClient,
  blockInfo: BlockInfo,
): Promise<EventsByType[]> {
  const txHashes = blockInfo.block.data.txs;
  if (txHashes.length === 0) {
    return [];
  }
  const txInfos = await getTxInfobyHashes(api, txHashes);

  const txLogs = txInfos.map((txInfo) => txInfo.logs);
  const txLogsFlat = ([] as TxLog[]).concat(...txLogs);
  const events = txLogsFlat.map((txLog) => txLog.eventsByType);
  return events;
}

export async function fetchTerraBlocksBatches(
  api: LCDClient,
  blockArray: number[],
): Promise<TerraBlockContent[]> {
  const blocks = await fetchTerraBlocksArray(api, blockArray);
  return Promise.all(
    blocks.map(
      async (blockInfo) =>
        <TerraBlockContent>{
          block: blockInfo,
          events: await getEventsByTypeFromBlock(api, blockInfo),
        },
    ),
  );
}
