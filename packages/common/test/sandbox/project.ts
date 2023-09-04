// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

// import {
//   SubstrateCustomDatasource,
//   SubstrateDatasourceKind,
//   SubstrateHandlerKind,
// } from '@subql/types';
// import {FileReference} from '@subql/types-core';

const myAssets = new Map<string, any>();
myAssets.set('erc20', {file: './abis/erc20Metadata.json'});

// user could import FrontierEvmDatasource/wasm etc
const CustomDs: any = {
  kind: 'substrate/FrontierEvm',
  startBlock: 1,
  assets: myAssets,
  processor: {file: '', options: {}},
  mapping: {
    file: '',
    handlers: [{handler: 'handleBond', kind: 'substrate/BlockHandler'}],
  },
};

const project: any = {
  version: '1',
  name: 'tsProject',
  schema: {file: './schema.graphql'},
  specVersion: '1.0.0',
  network: {
    chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
    endpoint: ['wss://polkadot.api.onfinality.io/public-ws', 'wss://rpc.polkadot.io'],
    dictionary: 'https://api.subquery.network/sq/subquery/polkadot-dictionary',
    chainTypes: {file: './dist/chaintypes.js'},
  },
  dataSources: [
    {
      kind: 'substrate/runtime', // SubstrateDatasourceKind.runtime , but we not import @subql/type in here, avoid loop dependencies
      startBlock: 1,
      mapping: {
        file: './dist/index.js',
        handlers: [
          {
            handler: 'handleEvent',
            kind: 'substrate/EventHandler',
            filter: {
              module: 'balances',
              method: 'Transfer',
            },
          },
        ],
      },
    },
  ],
  runner: {
    query: {
      name: '@subql/query',
      version: '*',
    },
    node: {
      name: '@subql/node',
      version: '*',
    },
  },
  description: '',
};

export default project;
