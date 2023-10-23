import {SubstrateDatasourceKind, SubstrateHandlerKind, SubstrateProject} from '@subql/types';

const project: SubstrateProject = {
  specVersion: '1.0.0',
  name: 'multichain-transfers-polkadot',
  version: '0.0.1',
  runner: {
    node: {
      name: '@subql/node',
      version: '>=1.0.0',
    },
    query: {
      name: '@subql/query',
      version: '*',
    },
  },
  description:
    'This project is an example of a multichain project that indexes multiple networks into the same database. Read more about it at https://academy.subquery.network/build/multi-chain.html',
  repository: 'https://github.com/subquery/multi-networks-transfers.git',
  schema: {
    file: './schema.graphql',
  },
  network: {
    chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
    endpoint: ['wss://polkadot.api.onfinality.io/public-ws', 'wss://rpc.polkadot.io'],
    dictionary: 'https://api.subquery.network/sq/subquery/polkadot-dictionary',
  },
  dataSources: [
    {
      kind: SubstrateDatasourceKind.Runtime,
      startBlock: 1,
      mapping: {
        file: './dist/index.js',
        handlers: [
          {
            handler: 'handlePolkadotEvent',
            kind: SubstrateHandlerKind.Event,
            filter: {
              module: 'balances',
              method: 'Transfer',
            },
          },
        ],
      },
    },
  ],
};

export default project;
