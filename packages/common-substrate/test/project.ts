// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

// import { SubstrateCustomDatasource, SubstrateCustomHandler, SubstrateDatasourceKind, SubstrateHandlerKind, SubstrateMapping, SubstrateProject, SubstrateRuntimeDatasource } from "./project";

// Can expand the Datasource processor types via the genreic param
const project /*: SubstrateProject<FrontierEvmDS | MoonbeamEvmDS>*/ = {
  specVersion: '1.0.0',
  schema: {
    file: './schema.graphql',
  },
  network: {
    chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
    bypassBlocks: [5, '1-10'],
    endpoint: 'wss://polkadot.api.onfinality.io/public-ws',
  },
  dataSources: [
    {
      kind: 'substrate/Runtime', //SubstrateDatasourceKind.Runtime,
      startBlock: 1,
      mapping: {
        file: './dist/index.js',
        handlers: [
          {
            kind: 'substrate/BlockHandler', //SubstrateHandlerKind.Block,
            handler: 'handleBlock',
            filter: {
              modulo: 5,
            },
          },
          {
            kind: 'substrate/CallHandler', //SubstrateHandlerKind.Call,
            handler: 'handleCall',
            filter: {
              module: 'balances',
              method: 'Deposit',
              success: true,
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
