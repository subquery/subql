// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ApiPromise } from '@polkadot/api';
import { Option, Vec } from '@polkadot/types';
import {
  BlockHash,
  EventRecord,
  LastRuntimeUpgradeInfo,
  RuntimeVersion,
  SignedBlock,
} from '@polkadot/types/interfaces';
import {
  SpecVersionRange,
  SubqlBlockFilter,
  SubqlCallFilter,
  SubqlEventFilter,
} from '@subql/common';
import {
  SubstrateBlock,
  SubstrateEvent,
  SubstrateExtrinsic,
} from '@subql/types';
import { last, merge, range } from 'lodash';
import { BlockContent } from '../indexer/types';

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
  filter?: SubqlBlockFilter,
): SubstrateBlock | undefined {
  if (!filter) return block;
  return filter.specVersion === undefined ||
    block.specVersion === undefined ||
    checkSpecRange(filter.specVersion, block.specVersion)
    ? block
    : undefined;
}

export function filterExtrinsics(
  extrinsics: SubstrateExtrinsic[],
  filter?: SubqlCallFilter,
): SubstrateExtrinsic[] {
  if (!filter) return extrinsics;
  return extrinsics.filter(
    ({ block, extrinsic, success }) =>
      (filter.specVersion === undefined ||
        block.specVersion === undefined ||
        checkSpecRange(filter.specVersion, block.specVersion)) &&
      (filter.module === undefined ||
        extrinsic.method.section === filter.module) &&
      (filter.method === undefined ||
        extrinsic.method.method === filter.method) &&
      (filter.success === undefined || success === filter.success),
  );
}

export function filterEvents(
  events: SubstrateEvent[],
  filter?: SubqlEventFilter,
): SubstrateEvent[] {
  if (!filter) return events;
  return events.filter(
    ({ block, event }) =>
      (filter.specVersion === undefined ||
        block.specVersion === undefined ||
        checkSpecRange(filter.specVersion, block.specVersion)) &&
      (filter.module ? event.section === filter.module : true) &&
      (filter.method ? event.method === filter.method : true),
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

export async function fetchBlocksViaRangeQuery(
  api: ApiPromise,
  startHeight: number,
  endHeight: number,
): Promise<BlockContent[]> {
  const blocks = await fetchBlocksRange(api, startHeight, endHeight);
  const firstBlockHash = blocks[0].block.header.hash;
  const endBlockHash = last(blocks).block.header.hash;
  const [blockEvents, runtimeUpgrades] = await Promise.all([
    api.query.system.events.range([firstBlockHash, endBlockHash]),
    api.query.system.lastRuntimeUpgrade.range([firstBlockHash, endBlockHash]),
  ]);

  let lastEvents: Vec<EventRecord>;
  let lastRuntimeUpgrade: Option<LastRuntimeUpgradeInfo>;
  return blocks.map((block, idx) => {
    const [, events = lastEvents] = blockEvents[idx] ?? [];
    const [, runtimeUpgrade = lastRuntimeUpgrade] = runtimeUpgrades[idx] ?? [];
    lastEvents = events;
    lastRuntimeUpgrade = runtimeUpgrade;

    const wrappedBlock = wrapBlock(
      block,
      events,
      runtimeUpgrade.unwrap()?.specVersion.toNumber(),
    );
    const wrappedExtrinsics = wrapExtrinsics(wrappedBlock, events);
    const wrappedEvents = wrapEvents(wrappedExtrinsics, events, wrappedBlock);
    return {
      block: wrappedBlock,
      extrinsics: wrappedExtrinsics,
      events: wrappedEvents,
    };
  });
}

export async function fetchBlocksRange(
  api: ApiPromise,
  startHeight: number,
  endHeight: number,
): Promise<SignedBlock[]> {
  return Promise.all(
    range(startHeight, endHeight + 1).map(async (height) => {
      const blockHash = await api.rpc.chain.getBlockHash(height);
      return api.rpc.chain.getBlock(blockHash);
    }),
  );
}

export async function fetchBlocksArray(
  api: ApiPromise,
  blockArray: number[],
): Promise<SignedBlock[]> {
  return Promise.all(
    blockArray.map(async (height) => {
      const blockHash = await api.rpc.chain.getBlockHash(height);
      return api.rpc.chain.getBlock(blockHash);
    }),
  );
}

export async function fetchEventsRange(
  api: ApiPromise,
  hashs: BlockHash[],
): Promise<Vec<EventRecord>[]> {
  return Promise.all(hashs.map((hash) => api.query.system.events.at(hash)));
}

export async function fetchRuntimeVersionRange(
  api: ApiPromise,
  hashs: BlockHash[],
): Promise<RuntimeVersion[]> {
  return Promise.all(
    hashs.map((hash) => api.rpc.state.getRuntimeVersion(hash)),
  );
}

export async function fetchBlocksBatches(
  api: ApiPromise,
  blockArray,
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
