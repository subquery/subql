// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Log, TransactionResponse} from '@ethersproject/abstract-provider';
import {BigNumber} from '@ethersproject/bignumber';
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
  SubstrateExtrinsic,
} from '@subql/types';
import {plainToClass} from 'class-transformer';
import {
  IsOptional,
  IsHexadecimal,
  validateSync,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  Validate,
  IsEthereumAddress,
} from 'class-validator';

type TopicFilter = string | string[] | null | undefined;

export type MoonbeamDatasource = SubqlCustomDatasource<'substrate/Moonbeam'>;

export interface MoonbeamEventFilter {
  address?: string;
  topics?: [TopicFilter, TopicFilter, TopicFilter, TopicFilter];
}

export interface MoonbeamCallFilter {
  from?: string;
  to?: string;
  methodId?: string;
}

export type MoonbeamEvent = Log;
export type MoonbeamCall = Omit<TransactionResponse, 'wait'>;

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
  @IsEthereumAddress()
  address?: string;
  @IsOptional()
  @Validate(TopicFilterValidator, {each: true})
  topics?: [TopicFilter, TopicFilter, TopicFilter, TopicFilter];
}

class MoonbeamCallFilterImpl implements MoonbeamCallFilter {
  @IsOptional()
  @IsEthereumAddress()
  from?: string;
  @IsOptional()
  @IsEthereumAddress()
  to?: string;
  @IsOptional()
  @IsHexadecimal()
  methodId?: string;
}

type RawEvent = {
  address: string;
  topics: string[];
  data: string;
};

type RawTransaction = {
  nonce: number;
  gasPrice: string;
  gasLimit: string;
  action: {
    call: string; // hex string
  };
  value: string;
  input: string; // hex string
  signature: {
    v: number;
    r: string; // hex string
    s: string; // hex string
  };
};

type ExecutionEvent = {
  from: string;
  to?: string; // Can be undefined for contract creation
  hash: string;
  status: unknown;
};

export function substrateHashToEthHash(original: CodecHash | string): string {
  const originalStr = typeof original === 'string' ? original : original.toHex();

  // TODO something like this https://github.com/PureStake/moonbeam/blob/master/client/rpc/txpool/src/lib.rs#L87
  return originalStr;
}

function hexStringEq(a: string, b: string): boolean {
  if (!isHexString(a) || !isHexString(b)) {
    throw new Error('Inputs are not hex strings');
  }
  return hexStripZeros(a) === hexStripZeros(b);
}

function getExecutionEvent(extrinsic: SubstrateExtrinsic): ExecutionEvent {
  const executionEvent = extrinsic.events.find(
    (evt) => evt.event.section === 'ethereum' && evt.event.method === 'Executed'
  );

  if (!executionEvent) {
    throw new Error('Extrinsic is not an etheruem transaction');
  }

  const [from, to, hash, status] = executionEvent.event.data;

  return {
    from: from.toHex(),
    to: to.toHex(),
    hash: hash.toHex(),
    status,
  };
}

const EventProcessor: SecondLayerHandlerProcessor<SubqlHandlerKind.Event, MoonbeamEventFilter, MoonbeamEvent> = {
  baseFilter: [{module: 'evm', method: 'Log'}],
  baseHandlerKind: 'substrate/EventHandler' as any /*SubqlHandlerKind.Event*/,
  transformer(original: SubstrateEvent): Log {
    const [eventData] = original.event.data;

    const {hash} = getExecutionEvent(original.extrinsic);

    const log = {
      ...(eventData.toJSON() as unknown as RawEvent),
      blockNumber: original.block.block.header.number.toNumber(),
      blockHash: substrateHashToEthHash(original.block.hash), // EXPECT 0x2ddc48977ab437df79ed1df813125d3654e192f1fa3bc997e5f90c80f64d7d91
      transactionIndex: original.extrinsic?.idx ?? -1,
      transactionHash: hash,
      removed: false, // TODO what does this mean?
      logIndex: original.idx, // Might be index of block not index relevant to tx
    };

    return log;
  },
  filterProcessor(filter: MoonbeamEventFilter, input: MoonbeamEvent): boolean {
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
      throw new Error(`Invalid Moonbeam event filter.\n${errorMsgs}`);
    }
  },
};

const CallProcessor: SecondLayerHandlerProcessor<SubqlHandlerKind.Call, MoonbeamCallFilter, MoonbeamCall> = {
  baseFilter: [{module: 'ethereum', method: 'transact'}],
  baseHandlerKind: 'substrate/CallHandler' as any /*SubqlHandlerKind.Call*/,
  transformer(original: SubstrateExtrinsic): MoonbeamCall {
    const [tx] = original.extrinsic.method.args;
    const rawTx = tx.toJSON() as unknown as RawTransaction;

    const {from, hash, to} = getExecutionEvent(original);

    const call: MoonbeamCall = {
      // Transaction properties
      from,
      to,
      nonce: rawTx.nonce,
      gasLimit: BigNumber.from(rawTx.gasLimit),
      gasPrice: BigNumber.from(rawTx.gasPrice),
      data: rawTx.input,
      value: BigNumber.from(rawTx.value),
      chainId: undefined, // TODO
      ...rawTx.signature,

      // Transaction response properties
      hash,
      blockNumber: original.block.block.header.number.toNumber(),
      blockHash: substrateHashToEthHash(original.block.hash),
      timestamp: Math.round(original.block.timestamp.getTime() / 1000),
      confirmations: 0, // TODO
    };

    return call;
  },
  filterProcessor(filter: MoonbeamCallFilter, input: MoonbeamCall): boolean {
    if (filter.from && filter.from !== input.from) {
      return false;
    }

    // if `to` is null then we handle contract creation
    if ((filter.to && filter.to !== input.to) || (filter.to === null && !!input.to)) {
      return false;
    }

    if (filter.methodId && input.data.indexOf(filter.methodId) !== 0) {
      return false;
    }

    return true;
  },
  filterValidator(filter?: MoonbeamCallFilter): void {
    if (!filter) return;
    const filterCls = plainToClass(MoonbeamCallFilterImpl, filter);
    const errors = validateSync(filterCls, {whitelist: true, forbidNonWhitelisted: true});

    if (errors?.length) {
      const errorMsgs = errors.map((e) => e.toString()).join('\n');
      throw new Error(`Invalid Moonbeam call filter.\n${errorMsgs}`);
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
    return ds.kind === this.kind;
  },
  handlerProcessors: {
    'substrate/MoonbeamEvent': EventProcessor,
    'substrate/MoonbeamCall': CallProcessor,
  },
};

export default MoonbeamDatasourcePlugin;
