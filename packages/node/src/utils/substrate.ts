// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { ApiPromise } from '@polkadot/api';
import { Vec } from '@polkadot/types';
import '@polkadot/api-augment/substrate';
import {
  BlockHash,
  EventRecord,
  RuntimeVersion,
  SignedBlock,
  Header,
} from '@polkadot/types/interfaces';
import { BN, BN_THOUSAND, BN_TWO, bnMin } from '@polkadot/util';
import { getLogger } from '@subql/node-core';
import {
  SpecVersionRange,
  SubstrateBlockFilter,
  SubstrateCallFilter,
  SubstrateEventFilter,
  SubstrateBlock,
  SubstrateEvent,
  SubstrateExtrinsic,
  BlockHeader,
} from '@subql/types';
import { last, merge, range } from 'lodash';
import { SubqlProjectBlockFilter } from '../configure/SubqueryProject';
import { ApiPromiseConnection } from '../indexer/apiPromise.connection';
import { BlockContent, LightBlockContent } from '../indexer/types';
const logger = getLogger('fetch');
const INTERVAL_THRESHOLD = BN_THOUSAND.div(BN_TWO);
const DEFAULT_TIME = new BN(6_000);
const A_DAY = new BN(24 * 60 * 60 * 1000);

export function wrapBlock(
  signedBlock: SignedBlock,
  events: EventRecord[],
  specVersion?: number,
): SubstrateBlock {
  return merge(signedBlock, {
    timestamp: getTimestamp(signedBlock),
    specVersion: specVersion,
    events,
  });
}

export function getTimestamp({ block: { extrinsics } }: SignedBlock): Date {
  for (const e of extrinsics) {
    const {
      method: { method, section },
    } = e;
    if (section === 'timestamp' && method === 'set') {
      const date = new Date(e.args[0].toJSON() as number);
      if (isNaN(date.getTime())) {
        throw new Error('timestamp args type wrong');
      }
      return date;
    }
  }
}

export function wrapExtrinsics(
  wrappedBlock: SubstrateBlock,
  allEvents: EventRecord[],
): SubstrateExtrinsic[] {
  return wrappedBlock.block.extrinsics.map((extrinsic, idx) => {
    const events = filterExtrinsicEvents(idx, allEvents);
    return {
      idx,
      extrinsic,
      block: wrappedBlock,
      events,
      success: getExtrinsicSuccess(events),
    };
  });
}

function getExtrinsicSuccess(events: EventRecord[]): boolean {
  return (
    events.findIndex((evt) => evt.event.method === 'ExtrinsicSuccess') > -1
  );
}

function filterExtrinsicEvents(
  extrinsicIdx: number,
  events: EventRecord[],
): EventRecord[] {
  return events.filter(
    ({ phase }) =>
      phase.isApplyExtrinsic && phase.asApplyExtrinsic.eqn(extrinsicIdx),
  );
}

export function wrapEvents(
  extrinsics: SubstrateExtrinsic[],
  events: EventRecord[],
  block: SubstrateBlock,
): SubstrateEvent[] {
  return events.reduce((acc, event, idx) => {
    const { phase } = event;
    const wrappedEvent: SubstrateEvent = merge(event, { idx, block });
    if (phase.isApplyExtrinsic) {
      wrappedEvent.extrinsic = extrinsics[phase.asApplyExtrinsic.toNumber()];
    }
    acc.push(wrappedEvent);
    return acc;
  }, [] as SubstrateEvent[]);
}

function checkSpecRange(
  specVersionRange: SpecVersionRange,
  specVersion: number,
) {
  const [lowerBond, upperBond] = specVersionRange;
  return (
    (lowerBond === undefined ||
      lowerBond === null ||
      specVersion >= lowerBond) &&
    (upperBond === undefined || upperBond === null || specVersion <= upperBond)
  );
}

export function filterBlock(
  block: SubstrateBlock,
  filter?: SubstrateBlockFilter,
): SubstrateBlock | undefined {
  if (!filter) return block;
  if (!filterBlockModulo(block, filter)) return;
  if (filter.timestamp) {
    if (!filterBlockTimestamp(block, filter as SubqlProjectBlockFilter)) {
      return;
    }
  }
  return filter.specVersion === undefined ||
    block.specVersion === undefined ||
    checkSpecRange(filter.specVersion, block.specVersion)
    ? block
    : undefined;
}

export function filterBlockModulo(
  block: SubstrateBlock,
  filter: SubstrateBlockFilter,
): boolean {
  const { modulo } = filter;
  if (!modulo) return true;
  return block.block.header.number.toNumber() % modulo === 0;
}

export function filterBlockTimestamp(
  block: SubstrateBlock,
  filter: SubqlProjectBlockFilter,
): boolean {
  const unixTimestamp = block.timestamp.getTime();
  if (unixTimestamp > filter.cronSchedule.next) {
    logger.info(
      `Block with timestamp ${new Date(
        unixTimestamp,
      ).toString()} is about to be indexed`,
    );
    logger.info(
      `Next block will be indexed at ${new Date(
        filter.cronSchedule.next,
      ).toString()}`,
    );
    filter.cronSchedule.schedule.prev();
    return true;
  } else {
    filter.cronSchedule.schedule.prev();
    return false;
  }
}

export function filterExtrinsic(
  { block, extrinsic, success }: SubstrateExtrinsic,
  filter?: SubstrateCallFilter,
): boolean {
  if (!filter) return true;
  return (
    (filter.specVersion === undefined ||
      block.specVersion === undefined ||
      checkSpecRange(filter.specVersion, block.specVersion)) &&
    (filter.module === undefined ||
      extrinsic.method.section === filter.module) &&
    (filter.method === undefined ||
      extrinsic.method.method === filter.method) &&
    (filter.success === undefined || success === filter.success) &&
    (filter.isSigned === undefined || extrinsic.isSigned === filter.isSigned)
  );
}

export function filterExtrinsics(
  extrinsics: SubstrateExtrinsic[],
  filterOrFilters: SubstrateCallFilter | SubstrateCallFilter[] | undefined,
): SubstrateExtrinsic[] {
  if (
    !filterOrFilters ||
    (filterOrFilters instanceof Array && filterOrFilters.length === 0)
  ) {
    return extrinsics;
  }
  const filters =
    filterOrFilters instanceof Array ? filterOrFilters : [filterOrFilters];
  return extrinsics.filter((extrinsic) =>
    filters.find((filter) => filterExtrinsic(extrinsic, filter)),
  );
}

export function filterEvent(
  { block, event }: SubstrateEvent,
  filter?: SubstrateEventFilter,
): boolean {
  if (!filter) return true;
  return (
    (filter.specVersion === undefined ||
      block.specVersion === undefined ||
      checkSpecRange(filter.specVersion, block.specVersion)) &&
    (filter.module ? event.section === filter.module : true) &&
    (filter.method ? event.method === filter.method : true)
  );
}

export function filterEvents(
  events: SubstrateEvent[],
  filterOrFilters?: SubstrateEventFilter | SubstrateEventFilter[] | undefined,
): SubstrateEvent[] {
  if (
    !filterOrFilters ||
    (filterOrFilters instanceof Array && filterOrFilters.length === 0)
  ) {
    return events;
  }
  const filters =
    filterOrFilters instanceof Array ? filterOrFilters : [filterOrFilters];
  return events.filter((event) =>
    filters.find((filter) => filterEvent(event, filter)),
  );
}

// TODO: prefetch all known runtime upgrades at once
export async function prefetchMetadata(
  api: ApiPromise,
  hash: BlockHash,
): Promise<void> {
  await api.getBlockRegistry(hash);
}

/**
 *
 * @param api
 * @param startHeight
 * @param endHeight
 * @param overallSpecVer exists if all blocks in the range have same parant specVersion
 */

export async function getBlockByHeight(
  api: ApiPromise,
  height: number,
): Promise<SignedBlock> {
  const blockHash = await api.rpc.chain.getBlockHash(height).catch((e) => {
    logger.error(`failed to fetch BlockHash ${height}`);
    throw ApiPromiseConnection.handleError(e);
  });

  const block = await api.rpc.chain.getBlock(blockHash).catch((e) => {
    logger.error(
      `failed to fetch Block hash="${blockHash}" height="${height}"`,
    );
    throw ApiPromiseConnection.handleError(e);
  });
  // validate block is valid
  if (block.block.header.hash.toHex() !== blockHash.toHex()) {
    throw new Error(
      `fetched block header hash ${block.block.header.hash.toHex()} is not match with blockHash ${blockHash.toHex()} at block ${height}. This is likely a problem with the rpc provider.`,
    );
  }
  return block;
}

export async function getHeaderByHeight(
  api: ApiPromise,
  height: number,
): Promise<Header> {
  const blockHash = await api.rpc.chain.getBlockHash(height).catch((e) => {
    logger.error(`failed to fetch BlockHash ${height}`);
    throw ApiPromiseConnection.handleError(e);
  });

  const header = await api.rpc.chain.getHeader(blockHash).catch((e) => {
    logger.error(
      `failed to fetch Block Header hash="${blockHash}" height="${height}"`,
    );
    throw ApiPromiseConnection.handleError(e);
  });
  // validate block is valid
  if (header.hash.toHex() !== blockHash.toHex()) {
    throw new Error(
      `fetched block header hash ${header.hash.toHex()} is not match with blockHash ${blockHash.toHex()} at block ${height}. This is likely a problem with the rpc provider.`,
    );
  }
  return header;
}

export async function fetchBlocksRange(
  api: ApiPromise,
  startHeight: number,
  endHeight: number,
): Promise<SignedBlock[]> {
  return Promise.all(
    range(startHeight, endHeight + 1).map(async (height) =>
      getBlockByHeight(api, height),
    ),
  );
}

export async function fetchBlocksArray(
  api: ApiPromise,
  blockArray: number[],
): Promise<SignedBlock[]> {
  return Promise.all(
    blockArray.map(async (height) => getBlockByHeight(api, height)),
  );
}

export async function fetchHeaderArray(
  api: ApiPromise,
  blockArray: number[],
): Promise<Header[]> {
  return Promise.all(
    blockArray.map(async (height) => getHeaderByHeight(api, height)),
  );
}

export async function fetchEventsRange(
  api: ApiPromise,
  hashs: BlockHash[],
): Promise<Vec<EventRecord>[]> {
  return Promise.all(
    hashs.map((hash) =>
      api.query.system.events.at(hash).catch((e) => {
        logger.error(`failed to fetch events at block ${hash}`);
        throw ApiPromiseConnection.handleError(e);
      }),
    ),
  );
}

export async function fetchRuntimeVersionRange(
  api: ApiPromise,
  hashs: BlockHash[],
): Promise<RuntimeVersion[]> {
  return Promise.all(
    hashs.map((hash) =>
      api.rpc.state.getRuntimeVersion(hash).catch((e) => {
        logger.error(`failed to fetch RuntimeVersion at block ${hash}`);
        throw ApiPromiseConnection.handleError(e);
      }),
    ),
  );
}

export async function fetchBlocksBatches(
  api: ApiPromise,
  blockArray: number[],
  overallSpecVer?: number,
): Promise<BlockContent[]> {
  const blocks = await fetchBlocksArray(api, blockArray);
  const blockHashs = blocks.map((b) => b.block.header.hash);
  const parentBlockHashs = blocks.map((b) => b.block.header.parentHash);
  // If overallSpecVersion passed, we don't need to use api to get runtimeVersions
  // wrap block with specVersion
  // If specVersion changed, we also not guarantee in this batch contains multiple runtimes,
  // therefore we better to fetch runtime over all blocks
  const [blockEvents, runtimeVersions] = await Promise.all([
    fetchEventsRange(api, blockHashs),
    overallSpecVer !== undefined // note, we need to be careful if spec version is 0
      ? undefined
      : fetchRuntimeVersionRange(api, parentBlockHashs),
  ]);
  return blocks.map((block, idx) => {
    const events = blockEvents[idx];
    const parentSpecVersion =
      overallSpecVer !== undefined
        ? overallSpecVer
        : runtimeVersions[idx].specVersion.toNumber();
    const wrappedBlock = wrapBlock(block, events.toArray(), parentSpecVersion);
    const wrappedExtrinsics = wrapExtrinsics(wrappedBlock, events);
    const wrappedEvents = wrapEvents(wrappedExtrinsics, events, wrappedBlock);

    wrappedBlock.block.header;
    return {
      block: wrappedBlock,
      extrinsics: wrappedExtrinsics,
      events: wrappedEvents,
    };
  });
}

// TODO why is fetchBlocksBatches a breadth first funciton rather than depth?
export async function fetchLightBlock(
  api: ApiPromise,
  height: number,
): Promise<LightBlockContent> {
  const blockHash = await api.rpc.chain.getBlockHash(height).catch((e) => {
    logger.error(`failed to fetch BlockHash ${height}`);
    throw ApiPromiseConnection.handleError(e);
  });

  const [header, events] = await Promise.all([
    api.rpc.chain.getHeader(blockHash).catch((e) => {
      logger.error(
        `failed to fetch Block Header hash="${blockHash}" height="${height}"`,
      );
      throw ApiPromiseConnection.handleError(e);
    }),
    api.query.system.events.at(blockHash).catch((e) => {
      logger.error(`failed to fetch events at block ${blockHash}`);
      throw ApiPromiseConnection.handleError(e);
    }),
  ]);

  const blockHeader: BlockHeader = {
    block: { header },
    events: events.toArray(),
  };

  return {
    block: blockHeader,
    events: events.map((evt, idx) => merge(evt, { idx, block: blockHeader })),
  };
}

export async function fetchBlocksBatchesLight(
  api: ApiPromise,
  blockArray: number[],
): Promise<LightBlockContent[]> {
  return Promise.all(blockArray.map((height) => fetchLightBlock(api, height)));
}

export function calcInterval(api: ApiPromise): BN {
  return bnMin(
    A_DAY,
    api.consts.babe?.expectedBlockTime ||
      (api.consts.difficulty?.targetBlockTime as any) ||
      api.consts.subspace?.expectedBlockTime ||
      (api.consts.timestamp?.minimumPeriod.gte(INTERVAL_THRESHOLD)
        ? api.consts.timestamp.minimumPeriod.mul(BN_TWO)
        : api.query.parachainSystem
        ? DEFAULT_TIME.mul(BN_TWO)
        : DEFAULT_TIME),
  );
}
