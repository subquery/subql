// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Log} from '@ethersproject/abstract-provider';
import {isHexString, hexStripZeros} from '@ethersproject/bytes';
import {ApiPromise} from '@polkadot/api';
import {CodecHash} from '@polkadot/types/interfaces';
import {
  SubqlDatasourceProcessor,
  SubqlCustomDatasource,
  SubqlHandlerKind,
  SubqlNetworkFilter,
  SubstrateEvent,
  SubqlEventFilter,
  SecondLayerHandlerProcessor,
} from '@subql/types';
import {plainToClass} from 'class-transformer';
import {
  IsOptional,
  IsString,
  validateSync,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  Validate,
} from 'class-validator';

type TopicFilter = string | string[] | null | undefined;

export type MoonbeamDatasource = SubqlCustomDatasource<'substrate/Moonbeam'>;

export interface MoonbeamEventFilter {
  address?: string;
  topics?: [TopicFilter, TopicFilter, TopicFilter, TopicFilter];
}

export type MoonbeamEvent = Log;

@ValidatorConstraint({name: 'topifFilterValidator', async: false})
export class TopicFilterValidator implements ValidatorConstraintInterface {
  validate(value: TopicFilter): boolean {
    return (
      !value ||
      (typeof value === 'string'
        ? isHexString(value)
        : Array.isArray(value)
        ? !value.find((v) => !isHexString(v))
        : false)
    );
  }

  defaultMessage(): string {
    return 'Value must be either null, undefined, hex string or hex string[]';
  }
}

class MoonbeamEventFilterImpl implements MoonbeamEventFilter {
  @IsOptional()
  @IsString()
  address?: string;
  @IsOptional()
  @Validate(TopicFilterValidator, {each: true})
  topics?: [TopicFilter, TopicFilter, TopicFilter, TopicFilter];
}

type RawEvent = {
  address: string;
  topics: string[];
  data: string;
};

function polkadotHashToEthHash(original: CodecHash): string {
  // TODO something like this https://github.com/PureStake/moonbeam/blob/master/client/rpc/txpool/src/lib.rs#L87
  return original.toHex();
}

function hexStringEq(a: string, b: string): boolean {
  if (!isHexString(a) || !isHexString(b)) {
    throw new Error('Inputs are not hex strings');
  }
  return hexStripZeros(a) === hexStripZeros(b);
}

const EventProcessor: SecondLayerHandlerProcessor<SubqlHandlerKind.Event, MoonbeamEventFilter, MoonbeamEvent> = {
  baseFilter: [{module: 'evm', method: 'Log'}],
  baseHandlerKind: 'substrate/EventHandler' as any /*SubqlHandlerKind.Event*/,
  transformer(original: SubstrateEvent, ds: MoonbeamDatasource): Log {
    const [eventData] = original.event.data;

    const log = {
      ...(eventData.toJSON() as unknown as RawEvent),
      blockNumber: original.block.block.header.number.toNumber(),
      blockHash: polkadotHashToEthHash(original.block.hash), // EXPECT 0x2ddc48977ab437df79ed1df813125d3654e192f1fa3bc997e5f90c80f64d7d91
      transactionIndex: original.extrinsic?.idx, // EXPECT 0
      transactionHash: polkadotHashToEthHash(original.extrinsic?.extrinsic.hash), // EXPECT 0x3a829a14031a74a4b3e212c26247d8d8e6599c9a9f927196e90ffce266402954
      removed: false, // TODO what does this mean?
      logIndex: original.idx, // Might be index of block not index relevant to tx
    };

    return log;
  },
  filterProcessor(filter: MoonbeamEventFilter, input: MoonbeamEvent, ds: MoonbeamDatasource): boolean {
    if (filter.address && filter.address !== input.address) {
      return false;
    }

    // Follows bloom filters https://docs.ethers.io/v5/concepts/events/#events--filters
    if (filter.topics) {
      for (let i = 0; i < Math.min(filter.topics.length, 4); i++) {
        const topic = filter.topics[i];
        if (!topic) {
          continue;
        }

        const topicArr = typeof topic === 'string' ? [topic] : topic;
        if (!topicArr.find((singleTopic) => hexStringEq(singleTopic, input.topics[i]))) {
          return false;
        }
      }
    }

    return true;
  },
  filterValidator(filter?: MoonbeamEventFilter): void {
    if (!filter) return;
    const filterCls = plainToClass(MoonbeamEventFilterImpl, filter);
    const errors = validateSync(filterCls, {whitelist: true, forbidNonWhitelisted: true});

    if (errors?.length) {
      const errorMsgs = errors.map((e) => e.toString()).join('\n');
      throw new Error(`Invalid event filter.\n${errorMsgs}`);
    }
  },
};

export const MoonbeamDatasourcePlugin: SubqlDatasourceProcessor<'substrate/Moonbeam', SubqlNetworkFilter> = {
  kind: 'substrate/Moonbeam',
  validate(ds: MoonbeamDatasource): void {
    // TODO move to ds-processor
    ds.mapping.handlers.map((handler) => this.handlerProcessors[handler.kind].filterValidator(handler.filter));
    return;
  },
  dsFilterProcessor(ds: MoonbeamDatasource, api: ApiPromise): boolean {
    return true;
  },
  handlerProcessors: {
    'substrate/MoonbeamEvent': EventProcessor,
  },
};

export default MoonbeamDatasourcePlugin;
