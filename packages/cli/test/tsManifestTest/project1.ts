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
    chainId: '0xb0a8d493285c2df73290dfb7e61f870f17b41801197a149ca93654499ea3dafe',
    endpoint: ['wss://kusama.api.onfinality.io/public-ws', 'wss://kusama-rpc.polkadot.io'],
    dictionary: 'https://api.subquery.network/sq/subquery/kusama-dictionary',
  },
  dataSources: [
    {
      kind: SubstrateDatasourceKind.Runtime,
      startBlock: 1,
      mapping: {
        file: './dist/index.js',
        handlers: [
          {
            handler: 'handleKusamaEvent',
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
