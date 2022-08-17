// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ApiPromise } from '@polkadot/api';
import { Option, Vec } from '@polkadot/types';
import '@polkadot/api-augment/substrate';
import {
  BlockHash,
  EventRecord,
  LastRuntimeUpgradeInfo,
  RuntimeVersion,
  SignedBlock,
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
} from '@subql/types';
import { last, merge, range } from 'lodash';
import { BlockContent } from '../indexer/types';
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

function getTimestamp({ block: { extrinsics } }: SignedBlock): Date {
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
    (filter.success === undefined || success === filter.success)
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
//Deprecated
export async function fetchBlocks(
  api: ApiPromise,
  startHeight: number,
  endHeight: number,
  overallSpecVer?: number,
): Promise<BlockContent[]> {
  const blocks = await fetchBlocksRange(api, startHeight, endHeight);
  const blockHashs = blocks.map((b) => b.block.header.hash);
  const parentBlockHashs = blocks.map((b) => b.block.header.parentHash);
  const [blockEvents, runtimeVersions] = await Promise.all([
    fetchEventsRange(api, blockHashs),
    overallSpecVer
      ? undefined
      : fetchRuntimeVersionRange(api, parentBlockHashs),
  ]);
  return blocks.map((block, idx) => {
    const events = blockEvents[idx];
    const parentSpecVersion = overallSpecVer
      ? overallSpecVer
      : runtimeVersions[idx].specVersion.toNumber();

    const wrappedBlock = wrapBlock(block, events.toArray(), parentSpecVersion);
    const wrappedExtrinsics = wrapExtrinsics(wrappedBlock, events);
    const wrappedEvents = wrapEvents(wrappedExtrinsics, events, wrappedBlock);
    return {
      block: wrappedBlock,
      extrinsics: wrappedExtrinsics,
      events: wrappedEvents,
    };
  });
}

async function getBlockByHeight(
  api: ApiPromise,
  height: number,
): Promise<SignedBlock> {
  const blockHash = await api.rpc.chain.getBlockHash(height).catch((e) => {
    logger.error(`failed to fetch BlockHash ${height}`);
    throw e;
  });
  return api.rpc.chain.getBlock(blockHash).catch((e) => {
    logger.error(`failed to fetch Block ${blockHash}`);
    throw e;
  });
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

export async function fetchEventsRange(
  api: ApiPromise,
  hashs: BlockHash[],
): Promise<Vec<EventRecord>[]> {
  return Promise.all(
    hashs.map((hash) =>
      api.query.system.events.at(hash).catch((e) => {
        logger.error(`failed to fetch events at block ${hash}`);
        throw e;
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
        throw e;
      }),
    ),
  );
}

export async function fetchBlocksBatches(
  api: ApiPromise,
  blockArray: number[],
  overallSpecVer?: number,
  // specVersionMap?: number[],
): Promise<BlockContent[]> {
  const blocks = await fetchBlocksArray(api, blockArray);
  const blockHashs = blocks.map((b) => b.block.header.hash);
  const parentBlockHashs = blocks.map((b) => b.block.header.parentHash);
  const [blockEvents, runtimeVersions] = await Promise.all([
    fetchEventsRange(api, blockHashs),
    overallSpecVer
      ? undefined
      : fetchRuntimeVersionRange(api, parentBlockHashs),
  ]);
  return blocks.map((block, idx) => {
    const events = blockEvents[idx];
    const parentSpecVersion = overallSpecVer
      ? overallSpecVer
      : runtimeVersions[idx].specVersion.toNumber();
    const wrappedBlock = wrapBlock(block, events.toArray(), parentSpecVersion);
    const wrappedExtrinsics = wrapExtrinsics(wrappedBlock, events);
    const wrappedEvents = wrapEvents(wrappedExtrinsics, events, wrappedBlock);
    return {
      block: wrappedBlock,
      extrinsics: wrappedExtrinsics,
      events: wrappedEvents,
    };
  });
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
