// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { EventRecord, SignedBlock } from '@polkadot/types/interfaces';
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
import { merge } from 'lodash';

export function wrapBlock(
  signedBlock: SignedBlock,
  specVersion?: number,
): SubstrateBlock {
  return merge(signedBlock, {
    timestamp: getTimestamp(signedBlock),
    specVersion: specVersion,
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
