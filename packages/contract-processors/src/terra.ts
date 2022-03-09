// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {
  SubqlTerraCustomDatasource,
  SubqlTerraCustomHandler,
  SubqlTerraMapping,
  SecondLayerTerraHandlerProcessor,
  SubqlTerraHandlerKind,
  TerraEvent,
  TerraCall,
  SubqlTerraDatasourceProcessor,
  DictionaryQueryEntry,
} from '@subql/types-terra';
import {MsgExecuteContract, LCDClient, Fee, hashToHex, EventsByType, TxInfo, BlockInfo} from '@terra-money/terra.js';
import {plainToClass} from 'class-transformer';
import {IsOptional, IsString, validateSync} from 'class-validator';
import {stringNormalizedEq} from './utils';

/*
sample MsgExecuteContract:
{"body":{"messages":["{\"@type\":\"/terra.wasm.v1beta1.MsgExecuteContract\",\"coins\":[],
\"contract\":\"terra1sepfj7s0aeg5967uxnfk4thzlerrsktkpelm5s\",\"execute_msg\":{\"borrow_stable\":{\"borrow_amount\":\"2856380000\"}},
\"sender\":\"terra1zgc0gwtavpyg64svv2nh2q9896eqhv0yp4553e\"}"],"memo":"","timeout_height":0},
"auth_info":{"signer_infos":[{"public_key":"{\"@type\":\"/cosmos.crypto.secp256k1.PubKey\",\"key\":\"AtIY/gHVqJjBydF5WpXOx/yuN/Ev56uQv0SLKtW7mzPs\"}",
"sequence":900,"mode_info":{"single":{"mode":1}}}],
"fee":"{\"amount\":[{\"amount\":\"250657\",\"denom\":\"uusd\"}],\"gas_limit\":\"1000000\",\"granter\":\"\",\"payer\":\"\"}"},
"signatures":["Z9HREaub/H01Qr7704TSvDerNKoAIDDQxJbCwjrBATJtpHE0jI7wMqqVpGqlsj6lUNsUau4SI4/0T5qcJzMqcg=="]}
*/

export type TerraContractDatasource = SubqlTerraCustomDatasource<
  'terra/Contracts',
  SubqlTerraMapping<SubqlTerraCustomHandler>,
  TerraContractProcessorOptions
>;

export class TerraContractProcessorOptions {
  @IsOptional()
  address?: string;
}

export interface TerraContractCallFilter {
  from?: string;
  function?: string;
}

class TerraContractCallFilterImpl implements TerraContractCallFilter {
  @IsOptional()
  from?: string;
  @IsOptional()
  function?: string;
}

export type TerraContractCall = {
  from: string;
  to: string;
  fee: Fee.Data;
  data: MsgExecuteContract.Data;
  hash: string;
  blockNumber: number;
  blockHash: string;
  timestamp: string;
  signatures: string[];
};

export type TerraContractEvent = {
  event: EventsByType;
  blockNumber: number;
  blockHash: string;
  blockTimestamp: string;
  msgIndex: number;
  transactionHash: string;
};

export interface TerraContractEventFilter {
  type: string;
}

class TerraContractEventFilterImpl implements TerraContractEventFilter {
  @IsString()
  type: string;
}

const EventProcessor: SecondLayerTerraHandlerProcessor<
  SubqlTerraHandlerKind.Event,
  TerraContractEventFilter,
  TerraContractEvent,
  TerraContractDatasource
> = {
  baseFilter: [],
  baseHandlerKind: SubqlTerraHandlerKind.Event,
  // eslint-disable-next-line @typescript-eslint/require-await
  async transformer(
    original: TerraEvent,
    ds: TerraContractDatasource,
    api: LCDClient,
    assets: Record<string, string>
  ): Promise<TerraContractEvent> {
    const data: TerraContractEvent = {
      event: original.event,
      blockNumber: +original.block.block.header.height,
      blockHash: original.block.block_id.hash,
      blockTimestamp: original.txInfo.timestamp,
      msgIndex: original.log.msg_index,
      transactionHash: original.txInfo.txhash,
    };

    return data;
  },
  filterProcessor(
    filter: TerraContractEventFilter | undefined,
    input: TerraEvent,
    ds: TerraContractDatasource
  ): boolean {
    const msg = input.txInfo.tx.body.messages[input.log.msg_index].toData();
    if (msg['@type'] !== '/terra.wasm.v1beta1.MsgExecuteContract') {
      return false;
    }
    if (ds.processor?.options?.address && !stringNormalizedEq(msg.contract, ds.processor.options.address)) {
      return false;
    }
    if (filter?.type && !(filter.type in input.event)) {
      return false;
    }
    console.log(input.event);
    return true;
  },
  filterValidator(filter?: TerraContractEventFilter): void {
    if (!filter) return;
    const filterCls = plainToClass(TerraContractEventFilterImpl, filter);
    const errors = validateSync(filterCls, {whitelist: true, forbidNonWhitelisted: true});

    if (errors?.length) {
      const errorMsgs = errors.map((e) => e.toString()).join('\n');
      throw new Error(`Invalid Frontier event filter.\n${errorMsgs}`);
    }
  },
  dictionaryQuery(filter: TerraContractEventFilter, ds: TerraContractDatasource): DictionaryQueryEntry {
    return;
  },
};

const CallProcessor: SecondLayerTerraHandlerProcessor<
  SubqlTerraHandlerKind.Call,
  TerraContractCallFilter,
  TerraContractCall,
  TerraContractDatasource
> = {
  baseHandlerKind: SubqlTerraHandlerKind.Call,
  baseFilter: [],
  // eslint-disable-next-line @typescript-eslint/require-await
  async transformer(
    original: TerraCall,
    ds: TerraContractDatasource,
    api: LCDClient,
    assets: Record<string, string>
  ): Promise<TerraContractCall> {
    return <TerraContractCall>{
      from: original.data.sender,
      to: original.data.contract,
      fee: original.tx.tx.auth_info.fee.toData(),
      data: original.data,
      hash: original.tx.txhash,
      blockNumber: +original.block.block.header.height,
      blockHash: hashToHex(original.block.block_id.hash),
      timestamp: original.tx.timestamp,
      signatures: original.tx.tx.signatures,
    };
  },
  filterProcessor(filter: TerraContractCallFilter | undefined, input: TerraCall, ds: TerraContractDatasource): boolean {
    try {
      const from = input.data.sender;
      const to = input.data.contract;
      if (filter?.from && !stringNormalizedEq(filter.from, from)) {
        return false;
      }

      //TODO: handle contract instantiation
      if (ds.processor?.options?.address && !stringNormalizedEq(ds.processor.options.address, to)) {
        return false;
      }

      if (!(filter?.function in input.data.execute_msg)) {
        return false;
      }
      console.log(input.data.execute_msg);
      return true;
    } catch (e) {
      (global as any).logger.warn('Unable to properly filter input');
      return false;
    }
  },
  filterValidator(filter?: TerraContractCallFilter): void {
    if (!filter) return;
    const filterCls = plainToClass(TerraContractCallFilterImpl, filter);
    const errors = validateSync(filterCls, {whitelist: true, forbidNonWhitelisted: true});

    if (errors?.length) {
      const errorMsgs = errors.map((e) => e.toString()).join('\n');
      throw new Error(`Invalid Frontier Evm call filter.\n${errorMsgs}`);
    }
  },
  dictionaryQuery(filter: TerraContractCallFilter, ds: TerraContractDatasource): DictionaryQueryEntry {
    return;
  },
};

export const TerraContractDatasourcePlugin: SubqlTerraDatasourceProcessor<'terra/Contracts', TerraContractDatasource> =
  {
    kind: 'terra/Contracts',
    validate(ds: TerraContractDatasource, assets: Record<string, string>): void {
      if (ds.processor.options) {
        const opts = plainToClass(TerraContractProcessorOptions, ds.processor.options);
        const errors = validateSync(opts, {whitelist: true, forbidNonWhitelisted: true});
        if (errors?.length) {
          const errorMsgs = errors.map((e) => e.toString()).join('\n');
          throw new Error(`Invalid Terra Contract call filter.\n${errorMsgs}`);
        }
      }
      return;
    },
    dsFilterProcessor(ds: TerraContractDatasource): boolean {
      return ds.kind === this.kind;
    },
    handlerProcessors: {
      'terra/ContractEvent': EventProcessor,
      'terra/ContractCall': CallProcessor,
    },
  };

export default TerraContractDatasourcePlugin;
