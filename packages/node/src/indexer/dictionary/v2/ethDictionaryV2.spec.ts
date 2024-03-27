// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {
  BlockHeightMap,
  DictionaryResponse,
  IBlock,
  NodeConfig,
} from '@subql/node-core';
import {
  EthereumBlock,
  EthereumDatasourceKind,
  EthereumHandlerKind,
  SubqlDatasource,
  SubqlRuntimeDatasource,
} from '@subql/types-ethereum';
import EventEmitter2 from 'eventemitter2';
import {
  EthereumProjectDs,
  EthereumProjectDsTemplate,
  SubqueryProject,
} from '../../../configure/SubqueryProject';
import { EthereumApi } from '../../../ethereum';
import { ethFilterDs } from '../utils';
import {
  buildDictionaryV2QueryEntry,
  EthDictionaryV2,
} from './ethDictionaryV2';

const DEFAULT_DICTIONARY = 'http://localhost:3000/rpc/eth-mainnet'; // Takoyaki returning incorrect results so these will fail
const HTTP_ENDPOINT = 'https://eth.llamarpc.com';
const mockDs: EthereumProjectDs[] = [
  {
    kind: EthereumDatasourceKind.Runtime,
    assets: new Map(),
    startBlock: 19217803,
    mapping: {
      file: './dist/index.js',
      handlers: [
        {
          handler: 'handleTransaction',
          kind: EthereumHandlerKind.Call,
          filter: {
            function: 'approve(address spender, uint256 rawAmount)',
          },
        },
        {
          handler: 'handleLog',
          kind: EthereumHandlerKind.Event,
          filter: {
            topics: [
              'Transfer(address indexed from, address indexed to, uint256 amount)',
            ],
          },
        },
      ],
    },
  },
];

const templateTs: EthereumProjectDsTemplate = {
  name: 'template',
  kind: EthereumDatasourceKind.Runtime,
  assets: new Map(),
  options: {
    abi: 'erc20',
    // address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
  },
  // startBlock: 1,
  mapping: {
    file: '',
    handlers: [
      {
        handler: 'handleLog',
        kind: EthereumHandlerKind.Event,
        filter: {
          topics: ['Transfer(address, address, uint256)'],
        },
      },
    ],
  },
};

// tx to is null
const mockDs2: EthereumProjectDs[] = [
  {
    kind: EthereumDatasourceKind.Runtime,
    assets: new Map(),
    startBlock: 19217803,
    mapping: {
      file: './dist/index.js',
      handlers: [
        {
          handler: 'handleTransaction',
          kind: EthereumHandlerKind.Call,
          filter: {
            to: null,
          },
        },
      ],
    },
  },
];

const nodeConfig = new NodeConfig({
  subquery: 'eth-starter',
  subqueryName: 'eth-starter',
  dictionaryTimeout: 10,
  networkEndpoint: [HTTP_ENDPOINT],
  networkDictionary: [DEFAULT_DICTIONARY],
});

function makeBlockHeightMap(mockDs: SubqlDatasource[]): BlockHeightMap<any> {
  const m = new Map<number, any>();
  mockDs.forEach((ds, index, dataSources) => {
    m.set(ds.startBlock, dataSources.slice(0, index + 1));
  });
  return new BlockHeightMap(m);
}

// enable this once dictionary v2 is online
describe('eth dictionary v2', () => {
  let ethDictionaryV2: EthDictionaryV2;

  const dsMap = makeBlockHeightMap(mockDs);

  beforeAll(async () => {
    ethDictionaryV2 = await EthDictionaryV2.create(
      DEFAULT_DICTIONARY,
      nodeConfig,
      { network: { chainId: '1' } } as SubqueryProject,
      new EthereumApi(HTTP_ENDPOINT, 1, new EventEmitter2()),
    );
  }, 10000);

  beforeEach(() => {
    ethDictionaryV2.updateQueriesMap(dsMap);
  });

  it('converts ds to v2 dictionary queries', () => {
    const query = (ethDictionaryV2 as any).queriesMap.get(19217803);
    expect(query.logs.length).toBe(1);
    expect(query.transactions.length).toBe(1);
  });

  it('query response match with entries', async () => {
    const ethBlocks = (await ethDictionaryV2.getData(
      19217803,
      (ethDictionaryV2 as any)._metadata.end,
      2,
    )) as DictionaryResponse<IBlock<EthereumBlock>>;

    expect(ethBlocks.batchBlocks.map((b) => b.block.number)).toStrictEqual([
      19217803, 19217804,
    ]);

    const ethBlock19217803 = ethBlocks.batchBlocks[0].block;
    const ethBlock19217804 = ethBlocks.batchBlocks[1].block;

    expect(ethBlock19217803.number).toBe(19217803);
    expect(ethBlock19217804.number).toBe(19217804);

    // To match with dictionaryQueryEntries[0].func
    expect(ethBlock19217803.transactions[0].input.indexOf('0xdb3e2198')).toBe(
      0,
    );

    expect(ethBlock19217804.logs.length).toBe(233);
    // This matches with dictionaryQueryEntries[0].topics
    expect(ethBlock19217804.logs[0].topics).toContain(
      '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
    );
  }, 10000);

  it('is able to convert raw v2 Blocks into eth blocks when getData', async () => {
    const ethBlocks = (await ethDictionaryV2.getData(
      19217803,
      (ethDictionaryV2 as any)._metadata.end,
      2,
    )) as DictionaryResponse<IBlock<EthereumBlock>>;

    expect(ethBlocks.batchBlocks[0].block.number).toStrictEqual(19217803);
    expect(ethBlocks.lastBufferedHeight).toStrictEqual(19217804);

    // Can include input and hash
    expect(ethBlocks.batchBlocks[1].block.transactions[1].hash).toBe(
      `0x3620616acae2c3050e7b993e207338803ceba628141b063430cb321da746c1ec`,
    );
    expect(ethBlocks.batchBlocks[1].block.transactions[1].input).toBe(
      `0xa9059cbb0000000000000000000000008ba631c37ce91a2d303be09907f496220a153d6a000000000000000000000000000000000000000000000000000000000c748d43`,
    );

    // relate logs
    expect(ethBlocks.batchBlocks[1].block.logs[0].data).toBe(`0x`);
  }, 10000);

  // Geth currently throwing errors with this request
  it.skip('is able to get transaction with field to is null', async () => {
    const dsMap = makeBlockHeightMap(mockDs2);
    ethDictionaryV2.updateQueriesMap(dsMap);

    const { conditions } = (ethDictionaryV2 as any).getQueryConditions(
      19217803,
      (ethDictionaryV2 as any)._metadata.end,
    );

    expect(conditions).toEqual({ transactions: [{ to: [null] }] });

    const ethBlocks = (await ethDictionaryV2.getData(
      19217803,
      (ethDictionaryV2 as any)._metadata.end,
      1,
    )) as DictionaryResponse<IBlock<EthereumBlock>>;

    const { hash, transactions } = ethBlocks.batchBlocks[0].block;

    expect(hash).toBe(
      '0xa9ba70126240a8418739a103527860948a2be32de2eb9a8f590591faa174c08b',
    );

    // https://etherscan.io/tx/0x57e8cd9483cb5d308151372b0cf33fdc615999283c80ee3c28e94f074dda61f1
    expect(
      transactions.find(
        (tx) =>
          tx.hash ===
          '0x57e8cd9483cb5d308151372b0cf33fdc615999283c80ee3c28e94f074dda61f1',
      ),
    ).toBeDefined();
  });

  it('is able to query with not null topics', async () => {
    /**
     * Dictionary v1 supported filtering logs where a topic was null or not null.
     * V2 doesn't yet support this but we should still be able to make a dictionary query that gets relevant logs.
     * It will just include events that will be filtered out later.
     * */

    const ds: SubqlRuntimeDatasource = {
      kind: EthereumDatasourceKind.Runtime,
      assets: new Map(),
      options: {
        abi: 'erc20',
      },
      startBlock: 19476187,
      mapping: {
        file: '',
        handlers: [
          {
            handler: 'handleLog',
            kind: EthereumHandlerKind.Event,
            filter: {
              topics: [
                'Transfer(address, address, uint256)',
                undefined,
                undefined,
                '!null',
              ],
            },
          },
        ],
      },
    };

    const dsMap = makeBlockHeightMap([ds]);
    ethDictionaryV2.updateQueriesMap(dsMap);

    const { conditions } = (ethDictionaryV2 as any).getQueryConditions(
      19476187,
      (ethDictionaryV2 as any)._metadata.end,
    );

    expect(conditions).toEqual({
      logs: [
        {
          address: [],
          topics0: [
            '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
          ],
          topics3: [],
        },
      ],
    });

    const ethBlocks = (await ethDictionaryV2.getData(
      19476187,
      (ethDictionaryV2 as any)._metadata.end,
      2,
    )) as DictionaryResponse<IBlock<EthereumBlock>>;

    const { hash, logs } = ethBlocks.batchBlocks[0].block;

    expect(hash).toEqual(
      '0xa798861151ed58ad67d80d1cf61dc30e65d003bc958e99a7969a05a67e69e0b2',
    );

    const log = logs.find((l) => l.logIndex === 184);
    expect(log).toBeDefined();
    expect(log.transactionHash).toEqual(
      '0x5491f3f4b7ca6cc81f992a17e19bc9bafff408518c643c5a254de44b5a7b6d72',
    );

    // Uncomment this when not null filter supported
    // expect(logs.filter(l => !l.topics[3]).length).toEqual(6) // There are 6 events with no topic3
  }, 100000);
});

describe('buildDictionaryV2QueryEntry', () => {
  it('Build filter for !null', () => {
    const ds: SubqlRuntimeDatasource = {
      kind: EthereumDatasourceKind.Runtime,
      assets: new Map(),
      options: {
        abi: 'erc20',
        address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
      },
      startBlock: 1,
      mapping: {
        file: '',
        handlers: [
          {
            handler: 'handleLog',
            kind: EthereumHandlerKind.Event,
            filter: {
              topics: [
                'Transfer(address, address, uint256)',
                undefined,
                undefined,
                '!null',
              ],
            },
          },
        ],
      },
    };
    const result = buildDictionaryV2QueryEntry([ds]);

    expect(result).toEqual({
      logs: [
        {
          address: ['0x7ceb23fd6bc0add59e62ac25578270cff1b9f619'],
          topics0: [
            '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
          ],
          topics3: [],
        },
      ],
    });
  });

  it('build query entries for multiple ds', () => {
    const ds: SubqlRuntimeDatasource[] = [
      {
        kind: EthereumDatasourceKind.Runtime,
        startBlock: 3327417,
        options: {
          abi: 'EnsRegistry',
          address: '0x314159265dd8dbb310642f98f50c066173c1259b',
        },
        assets: new Map(),
        mapping: {
          file: './dist/index.js',
          handlers: [
            // one duplicate one
            {
              kind: EthereumHandlerKind.Event,
              handler: 'handleTransferOldRegistry',
              filter: {
                topics: ['Transfer(bytes32,address)'],
              },
            },
            {
              kind: EthereumHandlerKind.Event,
              handler: 'handleTransferOldRegistry',
              filter: {
                topics: ['Transfer(bytes32,address)'],
              },
            },
            {
              kind: EthereumHandlerKind.Event,
              handler: 'handleNewOwnerOldRegistry',
              filter: {
                topics: ['NewOwner(bytes32,bytes32,address)'],
              },
            },
          ],
        },
      },
      {
        kind: EthereumDatasourceKind.Runtime,
        startBlock: 3327417,
        options: {
          abi: 'Resolver',
        },
        assets: new Map(),
        mapping: {
          file: './dist/index.js',
          handlers: [
            {
              kind: EthereumHandlerKind.Event,
              handler: 'handleABIChanged',
              filter: {
                topics: ['ABIChanged(bytes32,uint256)'],
              },
            },
            {
              kind: EthereumHandlerKind.Event,
              handler: 'handleAddrChanged',
              filter: {
                topics: ['AddrChanged(bytes32,address)'],
              },
            },
            {
              kind: EthereumHandlerKind.Event,
              handler: 'handleMulticoinAddrChanged',
              filter: {
                topics: ['AddressChanged(bytes32,uint256,bytes)'],
              },
            },
            {
              kind: EthereumHandlerKind.Event,
              handler: 'handleAuthorisationChanged',
              filter: {
                topics: ['AuthorisationChanged(bytes32,address,address,bool)'],
              },
            },
          ],
        },
      },
    ];

    const queryEntry = buildDictionaryV2QueryEntry(ds);
    // Total 7 handlers were given, 1 is duplicate
    expect(queryEntry.logs.length).toBe(6);
  });

  it('should unique QueryEntry for duplicate dataSources', () => {
    const ds: SubqlRuntimeDatasource = {
      kind: EthereumDatasourceKind.Runtime,
      assets: new Map(),
      options: {
        abi: 'erc20',
        address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
      },
      startBlock: 1,
      mapping: {
        file: '',
        handlers: [
          {
            handler: 'handleLog',
            kind: EthereumHandlerKind.Event,
            filter: {
              topics: ['Transfer(address, address, uint256)'],
            },
          },
          {
            handler: 'handleLogSame',
            kind: EthereumHandlerKind.Event,
            filter: {
              topics: ['Transfer(address, address, uint256)'],
            },
          },
          {
            handler: 'handleTx',
            kind: EthereumHandlerKind.Call,
            filter: {
              function: 'setminimumStakingAmount(uint256 amount)',
              from: 'mockAddress',
            },
          },
          {
            handler: 'handleTxSame',
            kind: EthereumHandlerKind.Call,
            filter: {
              function: 'setminimumStakingAmount(uint256 amount)',
              from: 'mockAddress',
            },
          },
        ],
      },
    };
    const result = buildDictionaryV2QueryEntry([ds]);

    expect(result).toEqual({
      logs: [
        {
          address: ['0x7ceb23fd6bc0add59e62ac25578270cff1b9f619'],
          topics0: [
            '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
          ],
        },
      ],
      transactions: [
        {
          from: ['mockaddress'],
          function: ['0x7ef9ea98'],
        },
      ],
    });
  });

  it('should group a small number of dynamic ds', () => {
    const ds: SubqlRuntimeDatasource[] = [];

    for (let i = 0; i < 10; i++) {
      // Bad nodejs types
      const tmp = (global as any).structuredClone(templateTs);
      (tmp.options.address = `0x${i}`), ds.push(tmp);
    }

    const result = buildDictionaryV2QueryEntry(ethFilterDs(ds));

    expect(result).toEqual({
      logs: [
        {
          address: [
            '0x0',
            '0x1',
            '0x2',
            '0x3',
            '0x4',
            '0x5',
            '0x6',
            '0x7',
            '0x8',
            '0x9',
          ],
          topics0: [
            '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
          ],
        },
      ],
    });
  });

  it('should remove address filter with large number of dynamic ds', () => {
    const ds: SubqlRuntimeDatasource[] = [];

    for (let i = 0; i < 200; i++) {
      // Bad nodejs types
      const tmp = (global as any).structuredClone(templateTs);
      (tmp.options.address = `0x${i}`), ds.push(tmp);
    }

    const result = buildDictionaryV2QueryEntry(ethFilterDs(ds));

    expect(result).toEqual({
      logs: [
        {
          address: [],
          topics0: [
            '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
          ],
        },
      ],
    });
  });
});
