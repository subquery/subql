// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {getPartialTransactionReceipt} from '@acala-network/eth-providers/lib/utils/transactionReceiptHelper';
import {Interface, Result} from '@ethersproject/abi';
import {Log, TransactionResponse} from '@ethersproject/abstract-provider';
import {BigNumber} from '@ethersproject/bignumber';
import {hexDataSlice} from '@ethersproject/bytes';
import {ApiPromise} from '@polkadot/api';
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

// https://github.com/AcalaNetwork/bodhi.js/blob/master/evm-subql/src/mappings/mappingHandlers.ts#L10
const DUMMY_TX_HASH = '0x6666666666666666666666666666666666666666666666666666666666666666';

type TopicFilter = string | null | undefined;

export type AcalaEvmDatasource = SubqlCustomDatasource<
  'substrate/AcalaEvm',
  SubqlNetworkFilter,
  SubqlMapping<SubqlCustomHandler>,
  AcalaEvmProcessorOptions
>;

export interface AcalaEvmEventFilter {
  topics?: [TopicFilter, TopicFilter, TopicFilter, TopicFilter];
}

export interface AcalaEvmCallFilter {
  from?: string;
  function?: string;
}

// TODO add valid_until, access_list
export type AcalaEvmEvent<T extends Result = Result> = Log & {args?: T; blockTimestamp: Date};
export type AcalaEvmCall<T extends Result = Result> = Omit<
  TransactionResponse,
  'wait' | 'confirmations' | 'r' | 's' | 'v' | 'chainId'
> & {
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

class AcalaEvmProcessorOptions {
  @IsOptional()
  @IsString()
  abi?: string;
  @IsOptional()
  @IsEthereumAddress()
  address?: string;
}

class AcalaEventFilterImpl implements AcalaEvmEventFilter {
  @IsOptional()
  @Validate(TopicFilterValidator, {each: true})
  topics?: [TopicFilter, TopicFilter, TopicFilter, TopicFilter];
}

class AcalaCallFilterImpl implements AcalaEvmCallFilter {
  @IsOptional()
  @IsEthereumAddress()
  from?: string;
  @IsOptional()
  @IsString()
  function?: string;
}

type ExecutionEvent = {
  from: string;
  to?: string;
  logs?: unknown; // TODO Vec<EtheruemLog>
};

function getExecutionEvent(extrinsic: SubstrateExtrinsic): ExecutionEvent {
  const executionEvent = extrinsic.events.find(
    (evt) => evt.event.section === 'evm' && (evt.event.method === 'Executed' || evt.event.method === 'ExecutedFailed')
  );

  if (!executionEvent) {
    throw new Error('eth execution failed');
  }

  const [from, to, logs] = executionEvent.event.data;

  return {
    from: from.toHex(),
    to: to.toHex(),
    logs,
  };
}

const contractInterfaces: Record<string, Interface> = {};

function buildInterface(ds: AcalaEvmDatasource, assets: Record<string, string>): Interface | undefined {
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
      contractInterfaces[abi] = new Interface(assets[abi]);
    } catch (e) {
      (global as any).logger.error(`Unable to parse ABI: ${e.message}`);
      throw new Error('ABI is invalid');
    }
  }

  return contractInterfaces[abi];
}

const EventProcessor: SecondLayerHandlerProcessor<
  SubqlHandlerKind.Event,
  AcalaEvmEventFilter,
  AcalaEvmEvent,
  AcalaEvmDatasource
> = {
  baseFilter: [{module: 'evm', method: 'Executed'}], // TODO executed failed
  baseHandlerKind: SubqlHandlerKind.Event,
  // eslint-disable-next-line @typescript-eslint/require-await
  async transformer(
    original: SubstrateEvent,
    ds: AcalaEvmDatasource,
    api: ApiPromise,
    assets: Record<string, string>
  ): Promise<AcalaEvmEvent> {
    const receipt = getPartialTransactionReceipt(original);
    // XXX what if there is more than one log
    const partialLog = receipt.logs[0];

    const log: AcalaEvmEvent = {
      ...partialLog,
      blockNumber: original.block.block.header.number.toNumber(),
      blockHash: original.block.hash.toHex(),
      blockTimestamp: original.block.timestamp,
      transactionIndex: original.extrinsic?.idx ?? -1,
      transactionHash: original.extrinsic?.extrinsic.hash.toHex() ?? DUMMY_TX_HASH,
    };

    try {
      const iface = buildInterface(ds, assets);

      log.args = iface?.parseLog(log).args;
    } catch (e) {
      // TODO setup ts config with global defs
      (global as any).logger?.warn(`Unable to parse log arguments, will be omitted from result: ${e.message}`);
    }

    return log;
  },
  filterProcessor(filter: AcalaEvmEventFilter | undefined, input: SubstrateEvent, ds: AcalaEvmDatasource): boolean {
    const receipt = getPartialTransactionReceipt(input);

    if (ds.processor?.options?.address && !stringNormalizedEq(ds.processor.options.address, receipt.to?.toString())) {
      return false;
    }

    // Follows bloom filters https://docs.ethers.io/v5/concepts/events/#events--filters
    if (filter?.topics) {
      for (let i = 0; i < Math.min(filter.topics.length, 4); i++) {
        const topic = filter.topics[i];
        if (!topic) {
          continue;
        }

        // XXXX what if there is more than one log
        if (!hexStringEq(eventToTopic(topic), receipt.logs[0].topics[i])) {
          return false;
        }
      }
    }

    return true;
  },
  filterValidator(filter?: AcalaEvmEventFilter): void {
    if (!filter) return;
    const filterCls = plainToClass(AcalaEventFilterImpl, filter);
    const errors = validateSync(filterCls, {whitelist: true, forbidNonWhitelisted: true});

    if (errors?.length) {
      const errorMsgs = errors.map((e) => e.toString()).join('\n');
      throw new Error(`Invalid Acala event filter.\n${errorMsgs}`);
    }
  },
  dictionaryQuery(filter: AcalaEvmEventFilter, ds: AcalaEvmDatasource): DictionaryQueryEntry {
    const queryEntry: DictionaryQueryEntry = {
      entity: 'evmLogs',
      conditions: [],
    };
    if (ds.processor?.options?.address) {
      queryEntry.conditions.push({field: 'address', value: ds.processor?.options?.address});
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
  AcalaEvmCallFilter,
  AcalaEvmCall,
  AcalaEvmDatasource
> = {
  baseFilter: [{module: 'evm', method: 'ethCall'}],
  baseHandlerKind: SubqlHandlerKind.Call,
  // eslint-disable-next-line @typescript-eslint/require-await
  async transformer(
    original: SubstrateExtrinsic,
    ds: AcalaEvmDatasource,
    api: ApiPromise,
    assets: Record<string, string>
  ): Promise<AcalaEvmCall> {
    const [tx, input, value, gasLimit] = original.extrinsic.method.args;

    const {from, to} = getExecutionEvent(original);

    const success = !!original.events.find((evt) => evt.event.section === 'evm' && evt.event.method === 'Executed');

    const call: AcalaEvmCall = {
      // Transaction properties
      from,
      to, // when contract creation
      nonce: original.extrinsic.nonce.toNumber(),
      gasLimit: BigNumber.from(gasLimit.toHex()),
      gasPrice: BigNumber.from(0), // TODO
      data: input.toHex(),
      value: BigNumber.from(value.toHex()),

      // Transaction response properties
      hash: original.extrinsic.hash.toHex(), // Substrate extrinsic hash
      blockNumber: original.block.block.header.number.toNumber(),
      blockHash: original.block.block.hash.toHex(), // Substrate block hash
      timestamp: Math.round(original.block.timestamp.getTime() / 1000),
      success,
    };

    try {
      const iface = buildInterface(ds, assets);

      call.args = iface?.decodeFunctionData(iface.getFunction(hexDataSlice(call.data, 0, 4)), call.data);
    } catch (e) {
      // TODO setup ts config with global defs
      (global as any).logger?.warn(`Unable to parse call arguments, will be omitted from result`);
    }

    return call;
  },
  filterProcessor(filter: AcalaEvmCallFilter | undefined, input: SubstrateExtrinsic, ds: AcalaEvmDatasource): boolean {
    try {
      const {from, to} = getExecutionEvent(input);

      if (filter?.from && !stringNormalizedEq(filter.from, from)) {
        return false;
      }

      const [_, txInput] = input.extrinsic.method.args as [any, any];

      if (ds.processor?.options?.address && !stringNormalizedEq(ds.processor.options.address, to)) {
        return false;
      }

      if (filter?.function && txInput.toHex().indexOf(functionToSighash(filter.function)) !== 0) {
        return false;
      }

      return true;
    } catch (e) {
      (global as any).logger?.warn('Unable to properly filter input');
      return false;
    }
  },
  filterValidator(filter?: AcalaEvmCallFilter): void {
    if (!filter) return;
    const filterCls = plainToClass(AcalaCallFilterImpl, filter);
    const errors = validateSync(filterCls, {whitelist: true, forbidNonWhitelisted: true});

    if (errors?.length) {
      const errorMsgs = errors.map((e) => e.toString()).join('\n');
      throw new Error(`Invalid Acala call filter.\n${errorMsgs}`);
    }
  },
  dictionaryQuery(filter: AcalaEvmCallFilter, ds: AcalaEvmDatasource): DictionaryQueryEntry {
    const queryEntry: DictionaryQueryEntry = {
      entity: 'evmTransactions',
      conditions: [],
    };
    if (ds.processor?.options?.address) {
      queryEntry.conditions.push({field: 'to', value: ds.processor?.options?.address});
    }
    if (filter?.from) {
      queryEntry.conditions.push({field: 'from', value: filter?.from});
    }

    if (filter?.function) {
      queryEntry.conditions.push({field: 'func', value: functionToSighash(filter.function)});
    }
    return queryEntry;
  },
};

export const AcalaDatasourcePlugin: SubqlDatasourceProcessor<
  'substrate/AcalaEvm',
  SubqlNetworkFilter,
  AcalaEvmDatasource
> = {
  kind: 'substrate/AcalaEvm',
  validate(ds: AcalaEvmDatasource, assets: Record<string, string>): void {
    if (ds.processor.options) {
      const opts = plainToClass(AcalaEvmProcessorOptions, ds.processor.options);
      const errors = validateSync(opts, {whitelist: true, forbidNonWhitelisted: true});
      if (errors?.length) {
        const errorMsgs = errors.map((e) => e.toString()).join('\n');
        throw new Error(`Invalid Acala call filter.\n${errorMsgs}`);
      }
    }

    buildInterface(ds, assets); // Will throw if unable to construct

    return;
  },
  dsFilterProcessor(ds: AcalaEvmDatasource): boolean {
    return ds.kind === this.kind;
  },
  handlerProcessors: {
    'substrate/AcalaEvmEvent': EventProcessor,
    'substrate/AcalaEvmCall': CallProcessor,
  },
};

export default AcalaDatasourcePlugin;
