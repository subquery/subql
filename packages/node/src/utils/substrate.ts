import { EventRecord, SignedBlock } from '@polkadot/types/interfaces';
import {
  SubstrateBlock,
  SubstrateExtrinsic,
  SubstrateEvent,
} from '@subql/types';
import { merge } from 'lodash';
import { SubqlCallFilter, SubqlEventFilter } from '@subql/common';

export function wrapBlock(signedBlock: SignedBlock): SubstrateBlock {
  return merge(signedBlock, { timestamp: getTimestamp(signedBlock) });
}

function getTimestamp({ block: { extrinsics } }: SignedBlock): Date {
  for (const e of extrinsics) {
    const {
      method: { section, method },
    } = e;
    if (section === 'timestamp' && method === 'set') {
      const date = new Date(e.args[0].toJSON() as number);
      if (isNaN(date.getTime())) {
        throw new Error('timestamp args type wrong');
      }
      return date;
    }
  }
  throw new Error('no timestamp.set found in the given block');
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
): SubstrateEvent[] {
  return events.reduce((acc, event, idx) => {
    const { phase } = event;
    const wrappedEvent: SubstrateEvent = merge(event, { idx });
    if (phase.isApplyExtrinsic) {
      wrappedEvent.extrinsic = extrinsics[phase.asApplyExtrinsic.toNumber()];
    }
    acc.push(wrappedEvent);
    return acc;
  }, [] as SubstrateEvent[]);
}

export function filterExtrinsics(
  extrinsics: SubstrateExtrinsic[],
  filter?: SubqlCallFilter,
): SubstrateExtrinsic[] {
  if (!filter) return extrinsics;
  return extrinsics.filter(
    ({ extrinsic }) =>
      (filter.module ? extrinsic.method.section === filter.module : true) &&
      (filter.method ? extrinsic.method.method === filter.method : true),
  );
}

export function filterEvents(
  events: SubstrateEvent[],
  filter?: SubqlEventFilter,
): SubstrateEvent[] {
  if (!filter) return events;
  return events.filter(
    ({ event }) =>
      (filter.module ? event.section === filter.module : true) &&
      (filter.method ? event.method === filter.method : true),
  );
}
