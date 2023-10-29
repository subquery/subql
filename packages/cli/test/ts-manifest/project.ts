// @ts-nocheck
import {EthereumProject, EthereumDatasourceKind, EthereumHandlerKind} from '@subql/types-ethereum';

// Can expand the Datasource processor types via the generic param
const project: EthereumProject = {
  specVersion: '1.0.0',
  version: '0.0.1',
  name: 'ethereum-subql-starter',
  description: 'This project can be use as a starting point for developing your new Ethereum SubQuery project',
  runner: {
    node: {
      name: '@subql/node-ethereum',
      version: '>=3.0.0',
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
    /**
     * chainId is the EVM Chain ID, for Ethereum this is 1
     * https://chainlist.org/chain/1
     */
    chainId: '1',
    /**
     * This endpoint must be a public non-pruned archive node
     * Public nodes may be rate limited, which can affect indexing speed
     * When developing your project we suggest getting a private API key
     * You can get them from OnFinality for free https://app.onfinality.io
     * https://documentation.onfinality.io/support/the-enhanced-api-service
     */
    endpoint: ['https://eth.api.onfinality.io/public'],
    dictionary: 'https://gx.api.subquery.network/sq/subquery/eth-dictionary',
  },
  dataSources: [
    {
      kind: EthereumDatasourceKind.Runtime,
      startBlock: 4719568,

      options: {
        // Must be a key of assets
        abi: 'erc20',
        // # this is the contract address for wrapped ether https://etherscan.io/address/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2
        address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      },
      assets: new Map([['erc20', {file: './abis/erc20.abi.json'}]]),
      mapping: {
        file: './dist/index.js',
        handlers: [
          {
            kind: EthereumHandlerKind.Call,
            handler: 'handleTransaction',
            filter: {
              /**
               * The function can either be the function fragment or signature
               * function: '0x095ea7b3'
               * function: '0x7ff36ab500000000000000000000000000000000000000000000000000000000'
               */
              function: 'approve(address spender, uint256 rawAmount)',
            },
          },
          {
            kind: EthereumHandlerKind.Event,
            handler: 'handleLog',
            filter: {
              /**
               * Follows standard log filters https://docs.ethers.io/v5/concepts/events/
               * address: "0x60781C2586D68229fde47564546784ab3fACA982"
               */
              topics: ['Transfer(address indexed from, address indexed to, uint256 amount)'],
            },
          },
        ],
      },
    },
  ],
  repository: 'https://github.com/subquery/ethereum-subql-starter',
};

export default project;
