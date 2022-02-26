// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import '@polkadot/api-augment';
import {Interface, Result} from '@ethersproject/abi';
import {Log, TransactionResponse} from '@ethersproject/abstract-provider';
import {BigNumber} from '@ethersproject/bignumber';
import {hexDataSlice} from '@ethersproject/bytes';
import {ApiPromise} from '@polkadot/api';
import {EthTransaction, TransactionV2, EvmLog, ExitReason} from '@polkadot/types/interfaces';
import {
  SubqlDatasourceProcessor,
  SubqlCustomDatasource,
  SubqlHandlerKind,
  SubqlNetworkFilter,
  SubstrateEvent,
  SecondLayerHandlerProcessor,
  SubstrateExtrinsic,
  SubqlCustomHandler,
  SubqlMapping,
  DictionaryQueryEntry,
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
import {eventToTopic, functionToSighash, hexStringEq, stringNormalizedEq} from './utils';

type TopicFilter = string | null | undefined;

export type FrontierDatasource = SubqlCustomDatasource<
  'substrate/Frontier',
  SubqlNetworkFilter,
  SubqlMapping<SubqlCustomHandler>,
  FrontierProcessorOptions
>;

export interface FrontierEventFilter {
  topics?: [TopicFilter, TopicFilter, TopicFilter, TopicFilter];
}

export interface FrontierCallFilter {
  from?: string;
  function?: string;
}

export type FrontierEvent<T extends Result = Result> = Log & {args?: T; blockTimestamp: Date};
export type FrontierCall<T extends Result = Result> = Omit<TransactionResponse, 'wait' | 'confirmations'> & {
  args?: T;
  success: boolean;
};

@ValidatorConstraint({name: 'topifFilterValidator', async: false})
export class TopicFilterValidator implements ValidatorConstraintInterface {
  validate(value: TopicFilter): boolean {
    try {
      return !value || (typeof value === 'string' ? !!eventToTopic(value) : false);
    } catch (e) {
      return false;
    }
  }

  defaultMessage(): string {
    return 'Value must be either null, undefined, hex string or hex string[]';
  }
}

class FrontierProcessorOptions {
  @IsOptional()
  @IsString()
  abi?: string;
  @IsOptional()
  @IsEthereumAddress()
  address?: string;
}

class FrontierEventFilterImpl implements FrontierEventFilter {
  @IsOptional()
  @Validate(TopicFilterValidator, {each: true})
  topics?: [TopicFilter, TopicFilter, TopicFilter, TopicFilter];
}

class FrontierCallFilterImpl implements FrontierCallFilter {
  @IsOptional()
  @IsEthereumAddress()
  from?: string;
  @IsOptional()
  @IsString()
  function?: string;
}

type RawEvent = {
  address: string;
  topics: string[];
  data: string;
};

type ExecutionEvent = {
  from: string;
  to?: string; // Can be undefined for contract creation
  hash: string;
  status: ExitReason;
};

function getExecutionEvent(extrinsic: SubstrateExtrinsic): ExecutionEvent {
  const executionEvent = extrinsic.events.find(
    (evt) => evt.event.section === 'ethereum' && evt.event.method === 'Executed'
  );

  if (!executionEvent) {
    throw new Error('eth execution failed');
  }

  const [from, to, hash, status] = executionEvent.event.data;

  return {
    from: from.toHex(),
    to: to.toHex(),
    hash: hash.toHex(),
    status: status as ExitReason,
  };
}

async function getEtheruemBlockHash(api: ApiPromise, blockNumber: number): Promise<string> {
  return undefined;

  // This is too expensive to call for each call/event, we need to find a more efficient approach
  // In the mean time blockNumber can be used
  // See https://github.com/subquery/subql/issues/568 for more info
  const block = await api.rpc.eth.getBlockByNumber(blockNumber, false);

  return block.unwrap().blockHash.toHex();
}

const contractInterfaces: Record<string, Interface> = {};

function buildInterface(ds: FrontierDatasource, assets: Record<string, string>): Interface | undefined {
  const abi = ds.processor?.options?.abi;
  if (!abi) {
    return;
  }

  if (!ds.assets?.get(abi)) {
    throw new Error(`ABI named "${abi}" not referenced in assets`);
  }

  // This assumes that all datasources have a different abi name or they are the same abi
  if (!contractInterfaces[abi]) {
    // Constructing the interface validates the ABI
    try {
      if (!assets[abi]) {
        throw new Error(`Abi "${abi}"not found in assets`);
      }
      let abiObj = JSON.parse(assets[abi]);

      /*
       * Allows parsing JSON artifacts as well as ABIs
       * https://trufflesuite.github.io/artifact-updates/background.html#what-are-artifacts
       */
      if (!Array.isArray(abiObj) && abiObj.abi) {
        abiObj = abiObj.abi;
      }

      contractInterfaces[abi] = new Interface(abiObj);
    } catch (e) {
      (global as any).logger.error(`Unable to parse ABI: ${e.message}`);
      throw new Error('ABI is invalid');
    }
  }

  return contractInterfaces[abi];
}

const EventProcessor: SecondLayerHandlerProcessor<
  SubqlHandlerKind.Event,
  FrontierEventFilter,
  FrontierEvent,
  FrontierDatasource
> = {
  baseFilter: [{module: 'evm', method: 'Log'}],
  baseHandlerKind: SubqlHandlerKind.Event,
  async transformer(
    original: SubstrateEvent,
    ds: FrontierDatasource,
    api: ApiPromise,
    assets: Record<string, string>
  ): Promise<FrontierEvent> {
    const [eventData] = original.event.data;

    const baseFilter = Array.isArray(EventProcessor.baseFilter)
      ? EventProcessor.baseFilter
      : [EventProcessor.baseFilter];
    const evmEvents =
      original.extrinsic?.events.filter((evt) =>
        baseFilter.find((filter) => filter.module === evt.event.section && filter.method === evt.event.method)
      ) ?? [];

    const {hash} = getExecutionEvent(original.extrinsic); // shouldn't fail here

    const log: FrontierEvent = {
      ...(eventData.toJSON() as unknown as RawEvent),
      blockNumber: original.block.block.header.number.toNumber(),
      blockHash: await getEtheruemBlockHash(api, original.block.block.header.number.toNumber()),
      blockTimestamp: original.block.timestamp,
      transactionIndex: original.extrinsic?.idx ?? -1,
      transactionHash: hash,
      removed: false,
      logIndex: evmEvents.indexOf(original),
    };

    try {
      const iface = buildInterface(ds, assets);

      log.args = iface?.parseLog(log).args;
    } catch (e) {
      // TODO setup ts config with global defs
      (global as any).logger.warn(`Unable to parse log arguments, will be omitted from result: ${e.message}`);
    }

    return log;
  },
  filterProcessor(filter: FrontierEventFilter | undefined, input: SubstrateEvent, ds: FrontierDatasource): boolean {
    const [eventData] = input.event.data;
    const rawEvent = eventData as EvmLog;

    if (
      ds.processor?.options?.address &&
      !stringNormalizedEq(ds.processor.options.address, rawEvent.address.toString())
    ) {
      return false;
    }

    // Follows bloom filters https://docs.ethers.io/v5/concepts/events/#events--filters
    if (filter?.topics) {
      for (let i = 0; i < Math.min(filter.topics.length, 4); i++) {
        const topic = filter.topics[i];
        if (!topic) {
          continue;
        }

        if (!hexStringEq(eventToTopic(topic), rawEvent.topics[i].toHex())) {
          return false;
        }
      }
    }

    return true;
  },
  filterValidator(filter?: FrontierEventFilter): void {
    if (!filter) return;
    const filterCls = plainToClass(FrontierEventFilterImpl, filter);
    const errors = validateSync(filterCls, {whitelist: true, forbidNonWhitelisted: true});

    if (errors?.length) {
      const errorMsgs = errors.map((e) => e.toString()).join('\n');
      throw new Error(`Invalid Frontier event filter.\n${errorMsgs}`);
    }
  },
  dictionaryQuery(filter: FrontierEventFilter, ds: FrontierDatasource): DictionaryQueryEntry {
    const queryEntry: DictionaryQueryEntry = {
      entity: 'evmLogs',
      conditions: [],
    };
    if (ds.processor?.options?.address) {
      queryEntry.conditions.push({
        field: 'address',
        value: ds.processor.options.address.toLowerCase(),
      });
    } else {
      return;
    }

    // Follows bloom filters https://docs.ethers.io/v5/concepts/events/#events--filters
    if (filter?.topics) {
      for (let i = 0; i < Math.min(filter.topics.length, 4); i++) {
        const topic = filter.topics[i];
        if (!topic) {
          continue;
        }
        const field = `topics${i}`;
        queryEntry.conditions.push({field, value: eventToTopic(topic)});
      }
    }
    return queryEntry;
  },
};

const CallProcessor: SecondLayerHandlerProcessor<
  SubqlHandlerKind.Call,
  FrontierCallFilter,
  FrontierCall,
  FrontierDatasource
> = {
  baseFilter: [{module: 'ethereum', method: 'transact'}],
  baseHandlerKind: SubqlHandlerKind.Call,
  async transformer(
    original: SubstrateExtrinsic,
    ds: FrontierDatasource,
    api: ApiPromise,
    assets: Record<string, string>
  ): Promise<FrontierCall> {
    const [tx] = original.extrinsic.method.args as [TransactionV2 | EthTransaction];

    const rawTx = (tx as TransactionV2).isEip1559
      ? (tx as TransactionV2).asEip1559
      : (tx as TransactionV2).isLegacy
      ? (tx as TransactionV2).asLegacy
      : (tx as EthTransaction);
    let from, hash, to, success;
    try {
      const executionEvent = getExecutionEvent(original);
      from = executionEvent.from;
      to = executionEvent.to;
      hash = executionEvent.hash;
      success = executionEvent.status.isSucceed;
    } catch (e) {
      success = false;
    }

    let call: FrontierCall;

    const baseCall /*: Partial<FrontierCall>*/ = {
      from,
      to, // when contract creation
      nonce: rawTx.nonce.toNumber(),
      gasLimit: BigNumber.from(rawTx.gasLimit.toBigInt()),
      data: rawTx.input.toHex(),
      value: BigNumber.from(rawTx.value.toBigInt()),

      // Transaction response properties
      hash,
      blockNumber: original.block.block.header.number.toNumber(),
      blockHash: await getEtheruemBlockHash(api, original.block.block.header.number.toNumber()),
      timestamp: Math.round(original.block.timestamp.getTime() / 1000),
      success,
    };

    if ((tx as TransactionV2).isEip1559) {
      const eip1559tx = (tx as TransactionV2).asEip1559;

      call = {
        ...baseCall,
        chainId: eip1559tx.chainId.toNumber(),
        maxFeePerGas: BigNumber.from(eip1559tx.maxFeePerGas.toBigInt()),
        maxPriorityFeePerGas: BigNumber.from(eip1559tx.maxPriorityFeePerGas.toBigInt()),

        s: eip1559tx.s.toHex(),
        r: eip1559tx.r.toHex(),
        type: 2,
      };
    } else {
      const legacyTx = (tx as TransactionV2).isLegacy ? (tx as TransactionV2).asLegacy : (tx as EthTransaction);

      call = {
        ...baseCall,

        gasPrice: BigNumber.from(legacyTx.gasPrice.toBigInt()),
        chainId: undefined,

        r: legacyTx.signature.r.toHex(),
        s: legacyTx.signature.s.toHex(),
        v: legacyTx.signature.v.toNumber(),
        type: 0,
      };
    }

    try {
      const iface = buildInterface(ds, assets);

      call.args = iface?.decodeFunctionData(iface.getFunction(hexDataSlice(call.data, 0, 4)), call.data);
    } catch (e) {
      // TODO setup ts config with global defs
      (global as any).logger.warn(`Unable to parse call arguments, will be omitted from result`);
    }

    return call;
  },
  filterProcessor(filter: FrontierCallFilter | undefined, input: SubstrateExtrinsic, ds: FrontierDatasource): boolean {
    try {
      const {from, to} = getExecutionEvent(input);

      if (filter?.from && !stringNormalizedEq(filter.from, from)) {
        return false;
      }

      const [tx] = input.extrinsic.method.args as [TransactionV2 | EthTransaction];

      const rawTx = (tx as TransactionV2).isEip1559
        ? (tx as TransactionV2).asEip1559
        : (tx as TransactionV2).isLegacy
        ? (tx as TransactionV2).asLegacy
        : (tx as EthTransaction);

      // if `to` is null then we handle contract creation
      if (
        (ds.processor?.options?.address && !stringNormalizedEq(ds.processor.options.address, to)) ||
        (ds.processor?.options?.address === null && !rawTx.action.isCreate)
      ) {
        return false;
      }

      if (filter?.function && rawTx.input.toHex().indexOf(functionToSighash(filter.function)) !== 0) {
        return false;
      }

      return true;
    } catch (e) {
      (global as any).logger.warn('Unable to properly filter input');
      return false;
    }
  },
  filterValidator(filter?: FrontierCallFilter): void {
    if (!filter) return;
    const filterCls = plainToClass(FrontierCallFilterImpl, filter);
    const errors = validateSync(filterCls, {whitelist: true, forbidNonWhitelisted: true});

    if (errors?.length) {
      const errorMsgs = errors.map((e) => e.toString()).join('\n');
      throw new Error(`Invalid Frontier call filter.\n${errorMsgs}`);
    }
  },
  dictionaryQuery(filter: FrontierCallFilter, ds: FrontierDatasource): DictionaryQueryEntry {
    const queryEntry: DictionaryQueryEntry = {
      entity: 'evmTransactions',
      conditions: [],
    };
    if (ds.processor?.options?.address) {
      queryEntry.conditions.push({field: 'to', value: ds.processor.options.address.toLowerCase()});
    }
    if (filter?.from) {
      queryEntry.conditions.push({field: 'from', value: filter.from.toLowerCase()});
    }

    if (filter?.function) {
      queryEntry.conditions.push({field: 'func', value: functionToSighash(filter.function)});
    }
    return queryEntry;
  },
};

export const FrontierDatasourcePlugin: SubqlDatasourceProcessor<
  'substrate/Frontier',
  SubqlNetworkFilter,
  FrontierDatasource
> = {
  kind: 'substrate/Frontier',
  validate(ds: FrontierDatasource, assets: Record<string, string>): void {
    if (ds.processor.options) {
      const opts = plainToClass(FrontierProcessorOptions, ds.processor.options);
      const errors = validateSync(opts, {whitelist: true, forbidNonWhitelisted: true});
      if (errors?.length) {
        const errorMsgs = errors.map((e) => e.toString()).join('\n');
        throw new Error(`Invalid Frontier call filter.\n${errorMsgs}`);
      }
    }

    buildInterface(ds, assets); // Will throw if unable to construct

    return;
  },
  dsFilterProcessor(ds: FrontierDatasource): boolean {
    return ds.kind === this.kind;
  },
  handlerProcessors: {
    'substrate/FrontierEvent': EventProcessor,
    'substrate/FrontierCall': CallProcessor,
  },
};

export default FrontierDatasourcePlugin;
