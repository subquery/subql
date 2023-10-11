import {
  SubstrateDatasourceKind,
  SubstrateHandlerKind,
  SubstrateProject,
  // @ts-ignore
} from '@subql/types';

// Can expand the Datasource processor types via the genreic param
const project: SubstrateProject = {
  specVersion: '1.0.0',
  version: '0.0.1',
  name: 'acala-starter',
  description:
    'This project can be used as a starting point for developing your SubQuery project. It indexes all transfers on Acala network',
  runner: {
    node: {
      name: '@subql/node',
      version: '>=3.0.1',
    },
    query: {
      name: '@subql/query',
      version: '*',
    },
  },
  schema: {
    file: './schema.graphql',
  },
  network: {
    chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3',
    endpoint: [`wss://acala-polkadot.api.onfinality.io/public-ws`, 'wss://acala-rpc-0.aca-api.network'],
    dictionary: 'https://api.subquery.network/sq/subquery/acala-dictionary',
    chaintypes: {
      file: './dist/chaintypes.js',
    },
  },
  dataSources: [
    {
      kind: SubstrateDatasourceKind.Runtime,
      startBlock: 1,
      mapping: {
        file: './dist/index.js',
        handlers: [
          {
            kind: SubstrateHandlerKind.Event,
            handler: 'handleEvent',
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
