// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {EventFragment, FunctionFragment, Interface, Result} from '@ethersproject/abi';
import {Log, TransactionResponse} from '@ethersproject/abstract-provider';
import {BigNumber} from '@ethersproject/bignumber';
import {isHexString, hexStripZeros, hexDataSlice} from '@ethersproject/bytes';
import {id} from '@ethersproject/hash';
import {ApiPromise} from '@polkadot/api';
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
  validateSync,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  Validate,
  IsEthereumAddress,
  IsString,
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
  function?: string;
}

export type MoonbeamEvent<T extends Result = Result> = Log & {args?: T};
export type MoonbeamCall<T extends Result = Result> = Omit<TransactionResponse, 'wait' | 'confirmations'> & {args?: T};

@ValidatorConstraint({name: 'topifFilterValidator', async: false})
export class TopicFilterValidator implements ValidatorConstraintInterface {
  validate(value: TopicFilter): boolean {
    try {
      return (
        !value ||
        (typeof value === 'string'
          ? !!eventToTopic(value)
          : Array.isArray(value)
          ? !!value.map((v) => !eventToTopic(v))
          : false)
      );
    } catch (e) {
      return false;
    }
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
  @IsString()
  function?: string;
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

function eventToTopic(input: string): string {
  if (isHexString(input)) return input;

  return id(EventFragment.fromString(input).format());
}

function functionToSighash(input: string): string {
  if (isHexString(input)) return input;

  return hexDataSlice(id(FunctionFragment.fromString(input).format()), 0, 4);
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

async function getEtheruemBlockHash(api: ApiPromise, blockNumber: number): Promise<string> {
  const block = await api.rpc.eth.getBlockByNumber(blockNumber, false);

  return block.unwrap().blockHash.toHex();
}

const contractInterfaces: Record<string, Interface> = {};

function buildInterface(ds: SubqlCustomDatasource, assets: Record<string, string>): Interface | undefined {
  if (!ds.abi) {
    return;
  }

  if (!ds.assets?.get(ds.abi)) {
    throw new Error(`ABI named "${ds.abi}" not referenced in assets`);
  }

  // This assumes that all datasources have a different abi name or they are the same abi
  if (!contractInterfaces[ds.abi]) {
    // Constructing the interface validates the ABI
    try {
      contractInterfaces[ds.abi] = new Interface(assets[ds.abi]);
    } catch (e) {
      (global as any).logger.error(`Unable to parse ABI: ${e.message}`);
      throw new Error('ABI is invalid');
    }
  }

  return contractInterfaces[ds.abi];
}

const EventProcessor: SecondLayerHandlerProcessor<SubqlHandlerKind.Event, MoonbeamEventFilter, MoonbeamEvent> = {
  baseFilter: [{module: 'evm', method: 'Log'}],
  baseHandlerKind: 'substrate/EventHandler' as any /*SubqlHandlerKind.Event*/,
  async transformer(
    original: SubstrateEvent,
    ds: SubqlCustomDatasource,
    api: ApiPromise,
    assets: Record<string, string>
  ): Promise<MoonbeamEvent> {
    const [eventData] = original.event.data;

    const {hash} = getExecutionEvent(original.extrinsic);

    const log: MoonbeamEvent = {
      ...(eventData.toJSON() as unknown as RawEvent),
      blockNumber: original.block.block.header.number.toNumber(),
      blockHash: await getEtheruemBlockHash(api, original.block.block.header.number.toNumber()),
      transactionIndex: original.extrinsic?.idx ?? -1,
      transactionHash: hash,
      removed: false,
      logIndex: original.idx, // Might be index of block not index relevant to tx
    };

    try {
      const iface = buildInterface(ds, assets);

      log.args = iface?.parseLog(log).args;
    } catch (e) {
      // This would make sense to log if we filtered first
      // TODO setup ts config with global defs
      // (global as any).logger.warn(`Unable to parse log arguments, will be omitted from result: ${e.message}`);
    }

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
        if (!topicArr.find((singleTopic) => hexStringEq(eventToTopic(singleTopic), input.topics[i]))) {
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
  async transformer(
    original: SubstrateExtrinsic,
    ds: SubqlCustomDatasource,
    api: ApiPromise,
    assets: Record<string, string>
  ): Promise<MoonbeamCall> {
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
      blockHash: await getEtheruemBlockHash(api, original.block.block.header.number.toNumber()),
      timestamp: Math.round(original.block.timestamp.getTime() / 1000),
    };

    try {
      const iface = buildInterface(ds, assets);

      call.args = iface?.decodeFunctionData(iface.getFunction(hexDataSlice(call.data, 0, 4)), call.data);
    } catch (e) {
      // This would make sense to log if we filtered first
      // TODO setup ts config with global defs
      // (global as any).logger.warn(`Unable to parse call arguments, will be omitted from result`);
    }

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

    if (filter.function && input.data.indexOf(functionToSighash(filter.function)) !== 0) {
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
  validate(ds: MoonbeamDatasource, assets: Record<string, string>): void {
    buildInterface(ds, assets); // Will throw if unable to construct

    return;
  },
  dsFilterProcessor(ds: MoonbeamDatasource): boolean {
    return ds.kind === this.kind;
  },
  handlerProcessors: {
    'substrate/MoonbeamEvent': EventProcessor,
    'substrate/MoonbeamCall': CallProcessor,
  },
};

export default MoonbeamDatasourcePlugin;
