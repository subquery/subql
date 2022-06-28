// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { CosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import {
  GeneratedType,
  Registry,
  decodeTxRaw,
  DecodedTxRaw,
} from '@cosmjs/proto-signing';
import { defaultRegistryTypes } from '@cosmjs/stargate';
import { Tendermint34Client } from '@cosmjs/tendermint-rpc';
import {
  SubqlCosmosMessageFilter,
  CosmosBlock,
  CosmosTransaction,
  CosmosMessage,
} from '@subql/types-cosmos';
import {
  MsgClearAdmin,
  MsgExecuteContract,
  MsgInstantiateContract,
  MsgMigrateContract,
  MsgStoreCode,
  MsgUpdateAdmin,
} from 'cosmjs-types/cosmwasm/wasm/v1/tx';
import { CosmosClient, KeepAliveClient } from '../indexer/api.service';
import { filterMessageData, wrapEvent } from './cosmos';
import * as CosmosUtil from './cosmos';

const ENDPOINT = 'https://rpc.juno-1.api.onfinality.io';
const CHAINID = 'juno-1';

const TEST_BLOCKNUMBER = 3266772;
const TEST_FAILTX_BLOCKNUMBER = 3451838;

const TEST_MESSAGE_FILTER_TRUE: SubqlCosmosMessageFilter = {
  type: '/cosmwasm.wasm.v1.MsgExecuteContract',
  contractCall: 'swap',
  values: {
    sender: 'juno16z990xkfph8vh4wx906k5jzergr4t9fg9sr3y6',
    contract: 'juno1e8n6ch7msks487ecznyeagmzd5ml2pq9tgedqt2u63vra0q0r9mqrjy6ys',
  },
};

const TEST_MESSAGE_FILTER_FALSE: SubqlCosmosMessageFilter = {
  type: '/cosmwasm.wasm.v1.MsgExecuteContract',
  contractCall: 'increment',
  values: {
    sender: 'juno16z990xkfph8vh4wx906k5jzergr4t9fg9sr3y6',
    contract: 'juno1e8n6ch7msks487ecznyeagmzd5ml2pq9tgedqt2u63vra0q0r9mqrjy6ys',
  },
};

const TEST_NESTED_MESSAGE_FILTER_TRUE: SubqlCosmosMessageFilter = {
  type: '/cosmwasm.wasm.v1.MsgExecuteContract',
  contractCall: 'swap',
  values: {
    'msg.swap.input_token': 'Token1',
  },
};

const TEST_NESTED_MESSAGE_FILTER_FALSE: SubqlCosmosMessageFilter = {
  type: '/cosmwasm.wasm.v1.MsgExecuteContract',
  contractCall: 'swap',
  values: {
    'msg.swap.input_token': 'Token2',
  },
};

const TEST_NESTED_MESSAGE_FILTER_INVALID_PATH: SubqlCosmosMessageFilter = {
  type: '/cosmwasm.wasm.v1.MsgExecuteContract',
  contractCall: 'swap',
  values: {
    'msg.swap.input_token.xxx': 'Token2',
  },
};

const TEST_MESSAGE_FILTER_FALSE_2: SubqlCosmosMessageFilter = {
  type: '/cosmwasm.wasm.v1.MsgStoreCode',
};

describe('CosmosUtils', () => {
  let api: CosmosClient;
  let decodedTx: DecodedTxRaw;
  let msg: CosmosMessage;

  beforeAll(async () => {
    const client = new KeepAliveClient(ENDPOINT);
    const tendermint = await Tendermint34Client.create(client);
    const wasmTypes: ReadonlyArray<[string, GeneratedType]> = [
      ['/cosmwasm.wasm.v1.MsgClearAdmin', MsgClearAdmin],
      ['/cosmwasm.wasm.v1.MsgExecuteContract', MsgExecuteContract],
      ['/cosmwasm.wasm.v1.MsgMigrateContract', MsgMigrateContract],
      ['/cosmwasm.wasm.v1.MsgStoreCode', MsgStoreCode],
      ['/cosmwasm.wasm.v1.MsgInstantiateContract', MsgInstantiateContract],
      ['/cosmwasm.wasm.v1.MsgUpdateAdmin', MsgUpdateAdmin],
    ];

    const registry = new Registry([...defaultRegistryTypes, ...wasmTypes]);
    api = new CosmosClient(tendermint, registry);
    const txInfos = await api.txInfoByHeight(TEST_BLOCKNUMBER);
    const txInfo = txInfos.find(
      (txInfo) =>
        txInfo.hash ===
        '1A796F30DD866CA2E9A866084CB10BF13B5F6502256D6503E8B1BAC358B15701',
    );
    decodedTx = decodeTxRaw(txInfo.tx);
    msg = {
      idx: 0,
      block: {} as CosmosBlock,
      tx: {} as CosmosTransaction,
      msg: {
        typeUrl: decodedTx.body.messages[0].typeUrl,
        get decodedMsg() {
          return api.decodeMsg<any>(decodedTx.body.messages[0]);
        },
      },
    };
  });

  it('filter message data for true', () => {
    const result = filterMessageData(msg, TEST_MESSAGE_FILTER_TRUE);
    expect(result).toEqual(true);
  });

  it('filter message data for false', () => {
    const result = filterMessageData(msg, TEST_MESSAGE_FILTER_FALSE);
    expect(result).toEqual(false);
  });

  it('filter nested message data for true', () => {
    const result = filterMessageData(msg, TEST_NESTED_MESSAGE_FILTER_TRUE);
    expect(result).toEqual(true);
  });

  it('filter nested message data for false', () => {
    const result = filterMessageData(msg, TEST_NESTED_MESSAGE_FILTER_FALSE);
    expect(result).toEqual(false);
  });

  it('filter nested message data for invalid path', () => {
    const result = filterMessageData(
      msg,
      TEST_NESTED_MESSAGE_FILTER_INVALID_PATH,
    );
    expect(result).toEqual(false);
  });

  it('does not wrap events of failed transaction', async () => {
    const blockInfo = await api.blockResults(TEST_FAILTX_BLOCKNUMBER);
    const failedTx = blockInfo.results[2];
    const tx: CosmosTransaction = {
      idx: 0,
      block: {} as CosmosBlock,
      tx: failedTx,
      hash: '',
      decodedTx: {} as DecodedTxRaw,
    };
    const events = wrapEvent({} as CosmosBlock, [tx], api);
    expect(events.length).toEqual(0);
  });

  it('does not lazy decode failed message filters', () => {
    const spy = jest.spyOn(msg.msg, 'decodedMsg', 'get');
    const result = filterMessageData(msg, TEST_MESSAGE_FILTER_FALSE_2);
    expect(spy).not.toHaveBeenCalled();
  });

  it('lazy decode passed message filters', () => {
    const spy = jest.spyOn(msg.msg, 'decodedMsg', 'get');
    const result = filterMessageData(msg, TEST_MESSAGE_FILTER_TRUE);
    expect(spy).toHaveBeenCalled();
  });
});
