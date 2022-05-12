// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {ApiPromise, WsProvider} from '@polkadot/api';
import {getLogger} from '@subql/node/src/utils/logger';
import {fetchBlocks} from '@subql/node/src/utils/substrate';
import {
  SecondLayerHandlerProcessor_1_0_0,
  SubstrateEvent,
  SubstrateExtrinsic,
  SubstrateHandlerKind,
} from '@subql/types';
import {typesBundleDeprecated} from 'moonbeam-types-bundle';
import FrontierEvmDatasourcePlugin, {
  FrontierEvmCall,
  FrontierEvmCallFilter,
  FrontierEvmDatasource,
  FrontierEvmEvent,
  FrontierEvmEventFilter,
} from './frontierEvm';

const erc20MiniAbi = `[
    {
        "constant": false,
        "inputs": [
            {
                "name": "_spender",
                "type": "address"
            },
            {
                "name": "_value",
                "type": "uint256"
            }
        ],
        "name": "approve",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_from",
                "type": "address"
            },
            {
                "name": "_to",
                "type": "address"
            },
            {
                "name": "_value",
                "type": "uint256"
            }
        ],
        "name": "transferFrom",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [
            {
                "name": "_to",
                "type": "address"
            },
            {
                "name": "_value",
                "type": "uint256"
            }
        ],
        "name": "transfer",
        "outputs": [
            {
                "name": "",
                "type": "bool"
            }
        ],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "name": "owner",
                "type": "address"
            },
            {
                "indexed": true,
                "name": "spender",
                "type": "address"
            },
            {
                "indexed": false,
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "Approval",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "name": "from",
                "type": "address"
            },
            {
                "indexed": true,
                "name": "to",
                "type": "address"
            },
            {
                "indexed": false,
                "name": "value",
                "type": "uint256"
            }
        ],
        "name": "Transfer",
        "type": "event"
    }
]`;

describe('FrontierDS', () => {
  jest.setTimeout(1000000);

  let api: ApiPromise;

  beforeAll(async () => {
    (global as any).logger = getLogger('FrontierTests');
    api = await ApiPromise.create({
      provider: new WsProvider('wss://moonriver.api.onfinality.io/public-ws'),
      typesBundle: typesBundleDeprecated as any,
    });
  });

  afterAll(async () => {
    delete (global as any).logger;
    await api?.disconnect();
  }, 30000);

  describe('FilterValidator', () => {
    const processor = FrontierEvmDatasourcePlugin.handlerProcessors['substrate/FrontierEvmEvent'];

    describe('FrontierEvmEvent', () => {
      it('validates with no filter', () => {
        expect(() => processor.filterValidator(undefined)).not.toThrow();
      });

      it.skip('validates with only an address', () => {
        expect(() => processor.filterValidator({address: '0x6bd193ee6d2104f14f94e2ca6efefae561a4334b'})).not.toThrow();
      });

      it('validates with only topics', () => {
        expect(() =>
          processor.filterValidator({topics: ['0x6bd193ee6d2104f14f94e2ca6efefae561a4334b', null]})
        ).not.toThrow();
      });

      // Not supported because of dictionary limitations
      it.skip('validates topics with OR option', () => {
        expect(() =>
          processor.filterValidator({
            topics: [
              [
                '0x6bd193ee6d2104f14f94e2ca6efefae561a4334b',
                '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
              ],
            ],
          })
        ).not.toThrow();
      });

      // it('checks the max number of topics', () => {
      //   expect(() => processor.filterValidator({ topics: [null, null, null, null, '0x00'] })).toThrow()
      // });

      it('checks topics are valid hex strings', () => {
        expect(() => processor.filterValidator({topics: ['Hello World']})).toThrow();
      });

      // Not supported because of dictionary limitations
      it.skip('checks OR topics are valid hex strings', () => {
        expect(() => processor.filterValidator({topics: [['Hello', 'World']]})).toThrow();
      });
    });
  });

  describe('FilterProcessor', () => {
    describe('FrontierEvmEvent', () => {
      const processor = FrontierEvmDatasourcePlugin.handlerProcessors[
        'substrate/FrontierEvmEvent'
      ] as SecondLayerHandlerProcessor_1_0_0<
        SubstrateHandlerKind.Event,
        any /*FrontierEvmEventFilter*/, // Disable to fix compiler error, tests don't have strictNullChecks enabled
        FrontierEvmEvent,
        FrontierEvmDatasource
      >;
      let log: SubstrateEvent;

      beforeAll(async () => {
        const [{events}] = await fetchBlocks(api, 752073, 752073);

        log = events[4];
      });

      it('filters just a matching address', () => {
        expect(
          processor.filterProcessor({
            filter: {},
            input: log,
            ds: {
              processor: {options: {address: '0x6bd193ee6d2104f14f94e2ca6efefae561a4334b'}},
            } as FrontierEvmDatasource,
          })
        ).toBeTruthy();
      });

      it('filters just a non-matching address', () => {
        expect(
          processor.filterProcessor({
            filter: {},
            input: log,
            ds: {processor: {options: {address: '0x00'}}} as FrontierEvmDatasource,
          })
        ).toBeFalsy();
      });

      it('filters topics matching 1', () => {
        expect(
          processor.filterProcessor({
            filter: {topics: ['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef']},
            input: log,
            ds: {} as FrontierEvmDatasource,
          })
        ).toBeTruthy();
      });

      it('filters topics matching 2', () => {
        expect(
          processor.filterProcessor({
            filter: {topics: [null, null, '0x000000000000000000000000f884c8774b09b3302f98e38c944eb352264024f8']},
            input: log,
            ds: {} as FrontierEvmDatasource,
          })
        ).toBeTruthy();
      });

      it('filters topics matching 3', () => {
        expect(
          processor.filterProcessor({
            filter: {
              topics: [
                '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
                null,
                '0x000000000000000000000000f884c8774b09b3302f98e38c944eb352264024f8',
              ],
            },
            input: log,
            ds: {} as FrontierEvmDatasource,
          })
        ).toBeTruthy();
      });

      it.skip('filters topics matching 4', () => {
        expect(
          processor.filterProcessor({
            filter: {topics: [['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef', '0x00']]},
            input: log,
            ds: {} as FrontierEvmDatasource,
          })
        ).toBeTruthy();
      });

      it('filters topics matching with event', () => {
        expect(
          processor.filterProcessor({
            filter: {topics: ['Transfer(address indexed from, address indexed to, uint256 value)']},
            input: log,
            ds: {} as FrontierEvmDatasource,
          })
        ).toBeTruthy();

        expect(
          processor.filterProcessor({
            filter: {topics: ['Transfer(address from, address to, uint256 value)']},
            input: log,
            ds: {} as FrontierEvmDatasource,
          })
        ).toBeTruthy();

        expect(
          processor.filterProcessor({
            filter: {topics: ['Transfer(address, address, uint256)']},
            input: log,
            ds: {} as FrontierEvmDatasource,
          })
        ).toBeTruthy();
      });

      it('filters topics NOT matching 1', () => {
        expect(
          processor.filterProcessor({
            filter: {topics: ['0x6bd193ee6d2104f14f94e2ca6efefae561a4334b']},
            input: log,
            ds: {} as FrontierEvmDatasource,
          })
        ).toBeFalsy();
      });

      it('filters topics NOT matching 2', () => {
        expect(
          processor.filterProcessor({
            filter: {
              topics: [
                '0x6bd193ee6d2104f14f94e2ca6efefae561a4334b',
                null,
                '0x000000000000000000000000f884c8774b09b3302f98e38c944eb352264024f8',
              ],
            },
            input: log,
            ds: {} as FrontierEvmDatasource,
          })
        ).toBeFalsy();
      });

      it('filters topics without zero padding', () => {
        expect(
          processor.filterProcessor({
            filter: {topics: [null, null, '0xf884c8774b09b3302f98e38c944eb352264024f8']},
            input: log,
            ds: {} as FrontierEvmDatasource,
          })
        ).toBeTruthy();
      });
    });

    describe('FrontierEvmCall', () => {
      const processor = FrontierEvmDatasourcePlugin.handlerProcessors[
        'substrate/FrontierEvmCall'
      ] as SecondLayerHandlerProcessor_1_0_0<
        SubstrateHandlerKind.Call,
        FrontierEvmCallFilter,
        FrontierEvmCall,
        FrontierEvmDatasource
      >;

      let transaction: SubstrateExtrinsic;

      beforeAll(async () => {
        const [{extrinsics}] = await fetchBlocks(api, 763971, 763971);

        transaction = extrinsics[3];
      });

      it('can filter from', () => {
        expect(
          processor.filterProcessor({
            filter: {from: '0x0a3f21A6B1B93f15F0d9Dbf0685e3dFdC4889EB0'},
            input: transaction,
            ds: {} as FrontierEvmDatasource,
          })
        ).toBeTruthy();
        expect(
          processor.filterProcessor({
            filter: {from: '0x0000000000000000000000000000000000000000'},
            input: transaction,
            ds: {} as FrontierEvmDatasource,
          })
        ).toBeFalsy();
      });

      it('can filter contract address', () => {
        expect(
          processor.filterProcessor({
            filter: {},
            input: transaction,
            ds: {
              processor: {options: {address: '0xAA30eF758139ae4a7f798112902Bf6d65612045f'}},
            } as FrontierEvmDatasource,
          })
        ).toBeTruthy();
        expect(
          processor.filterProcessor({
            filter: {},
            input: transaction,
            ds: {
              processor: {options: {address: '0x0000000000000000000000000000000000000000'}},
            } as FrontierEvmDatasource,
          })
        ).toBeFalsy();
      });

      it('can filter for contract creation', async () => {
        const blockNumber = 442090;
        const [{extrinsics}] = await fetchBlocks(api, blockNumber, blockNumber);

        const contractTx = extrinsics[4];
        expect(
          processor.filterProcessor({
            filter: {},
            input: contractTx,
            ds: {processor: {options: {address: null}}} as FrontierEvmDatasource,
          })
        ).toBeTruthy();
      }, 40000);

      it('can filter function with signature', () => {
        expect(
          processor.filterProcessor({
            filter: {
              function: 'swapExactETHForTokens(uint256 amountOutMin, address[] path, address to, uint256 deadline)',
            },
            input: transaction,
            ds: {} as FrontierEvmDatasource,
          })
        ).toBeTruthy();
        expect(
          processor.filterProcessor({
            filter: {function: 'swapExactETHForTokens(uint256, address[], address, uint256)'},
            input: transaction,
            ds: {} as FrontierEvmDatasource,
          })
        ).toBeTruthy();
      });

      it('can filter function with method id', () => {
        expect(
          processor.filterProcessor({
            filter: {function: '0x7ff36ab500000000000000000000000000000000000000000000000000000000'},
            input: transaction,
            ds: {} as FrontierEvmDatasource,
          })
        ).toBeTruthy();
        expect(
          processor.filterProcessor({
            filter: {function: '0x7ff36ab5'},
            input: transaction,
            ds: {} as FrontierEvmDatasource,
          })
        ).toBeTruthy();

        expect(
          processor.filterProcessor({
            filter: {function: '0x0000000'},
            input: transaction,
            ds: {} as FrontierEvmDatasource,
          })
        ).toBeFalsy();
      });

      it('can filter function on a legacy transaction post EIP1559', async () => {
        const moonbeamApi = await ApiPromise.create({
          provider: new WsProvider('wss://moonbeam.api.onfinality.io/public-ws'),
          typesBundle: typesBundleDeprecated as any,
        });
        const [{extrinsics}] = await fetchBlocks(moonbeamApi, 459730, 459730);

        transaction = extrinsics[3];

        expect(
          processor.filterProcessor({
            filter: {function: '0xab0a39e6'},
            input: transaction,
            ds: {} as FrontierEvmDatasource,
          })
        ).toBeTruthy();
      });
    });
  });

  describe('FrontierTransformation', () => {
    const baseDS: FrontierEvmDatasource = {
      kind: 'substrate/FrontierEvm',
      assets: new Map([['erc20', {file: erc20MiniAbi}]]),
      processor: {
        file: '',
        options: {
          abi: 'erc20',
        },
      },
      mapping: {
        file: '',
        handlers: [
          {
            kind: 'substrate/FrontierEvmCall',
            filter: {},
            handler: 'imaginaryHandler',
          },
        ],
      },
    };

    describe('FrontierEvmEvents', () => {
      const processor = FrontierEvmDatasourcePlugin.handlerProcessors[
        'substrate/FrontierEvmEvent'
      ] as SecondLayerHandlerProcessor_1_0_0<
        SubstrateHandlerKind.Event,
        FrontierEvmEventFilter,
        FrontierEvmEvent,
        FrontierEvmDatasource
      >;

      it('can transform an event', async () => {
        // https://moonriver.subscan.io/block/717200
        // https://blockscout.moonriver.moonbeam.network/blocks/717200/transactions
        const blockNumber = 717200;
        const [{events}] = await fetchBlocks(api, blockNumber, blockNumber);

        const [event] = (await processor.transformer({
          input: events[4],
          ds: baseDS,
          api,
          assets: {erc20: erc20MiniAbi},
        })) as [FrontierEvmEvent];

        expect(event.address).toBe('0x6bd193ee6d2104f14f94e2ca6efefae561a4334b');
        expect(event.transactionIndex).toBe(3);
        expect(event.transactionHash).toBe('0x9ef1e4b4122af4f424497958fdfe6d18ccce2924184dfbeb4982e907f4f1fe0e');
        expect(event.logIndex).toBe(0);
        expect(event.blockNumber).toBe(blockNumber);
        expect(event.data).toBe('0x000000000000000000000000000000000000000000000000038a99fda46ed353');
        expect(event.topics[0]).toBe('0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef');
        expect(event.topics[1]).toBe('0x0000000000000000000000000000000000000000000000000000000000000000');
        expect(event.topics[2]).toBe('0x000000000000000000000000f884c8774b09b3302f98e38c944eb352264024f8');

        expect(event.args?.from).toBe('0x0000000000000000000000000000000000000000');
        expect(event.args?.to).toBe('0xf884c8774b09b3302f98e38C944eB352264024F8');
        expect(event.args?.value.toString()).toBe('255185643564356435');

        const [event2] = (await processor.transformer({input: events[6], ds: baseDS, api})) as [FrontierEvmEvent];

        expect(event2.logIndex).toBe(2);
      });
    });

    describe('FrontierEvmCalls', () => {
      const processor = FrontierEvmDatasourcePlugin.handlerProcessors[
        'substrate/FrontierEvmCall'
      ] as SecondLayerHandlerProcessor_1_0_0<
        SubstrateHandlerKind.Call,
        FrontierEvmCallFilter,
        FrontierEvmCall,
        FrontierEvmDatasource
      >;

      it('can transform a contract tx', async () => {
        // https://moonriver.subscan.io/block/717200
        // https://blockscout.moonriver.moonbeam.network/blocks/717200/transactions
        const blockNumber = 717200;
        const [{extrinsics}] = await fetchBlocks(api, blockNumber, blockNumber);

        const [call] = (await processor.transformer({input: extrinsics[3], ds: baseDS, api})) as [FrontierEvmCall];

        expect(call.from).toBe('0x6d15eff7c4d740c4683a23abeb432f0a1b255a12');
        expect(call.to).toBe('0xf03b75831397d4695a6b9dddeea0e578faa30907');
        expect(call.nonce).toBe(27);
        expect(call.data).toBe(
          '0xe2bbb15800000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000'
        );
        expect(call.hash).toBe('0x9ef1e4b4122af4f424497958fdfe6d18ccce2924184dfbeb4982e907f4f1fe0e');
        expect(call.blockNumber).toBe(blockNumber);
        expect(call.success).toBeTruthy();

        // Signature values
        expect(call.r).toBeDefined();
        expect(call.s).toBeDefined();
        expect(call.v).toBeDefined();

        // expect(call.blockHash).toBe('0x7399a701a5827d2cf0365d94ab1d0c1864d7fe3f41c316dc283e86e87b372ce8');

        // TODO setup abi/interface passing
      });

      it('can transform a transfer tx', async () => {
        // https://moonriver.subscan.io/block/829319
        // https://blockscout.moonriver.moonbeam.network/blocks/829319/transactions

        const blockNumber = 829319;
        const [{extrinsics}] = await fetchBlocks(api, blockNumber, blockNumber);

        const [call] = (await processor.transformer({input: extrinsics[3], ds: baseDS, api})) as [FrontierEvmCall];

        expect(call.from).toBe('0x5aec27384dbe84d46c29a20dfeff09493711cd15');
        expect(call.to).toBe('0x2ddcfdb16c370f116e12db9863901b6e224af15a');
        expect(call.nonce).toBe(5252);
        expect(call.data).toBe('0x');
        expect(call.hash).toBe('0xe76c8ffe66978d594147b97e741f21ec470f3bd2a18c11495d700b3330206649');
        expect(call.blockNumber).toBe(blockNumber);
        expect(call.success).toBeTruthy();
        expect(call.value.toString()).toBe('5000000000000000');

        // Signature values
        expect(call.r).toBeDefined();
        expect(call.s).toBeDefined();
        expect(call.v).toBeDefined();

        // expect(call.blockHash).toBe('0xaadd85c55f7f8c31140f38b840cf269cdc230a8b7d8057366fbeb3a22c6de0f9');
      });

      it('can transform a contract creation tx', async () => {
        // https://moonriver.subscan.io/block/442090
        // https://blockscout.moonriver.moonbeam.network/blocks/442090/transactions

        const blockNumber = 442090;
        const [{extrinsics}] = await fetchBlocks(api, blockNumber, blockNumber);

        const [call] = (await processor.transformer({input: extrinsics[4], ds: baseDS, api})) as [FrontierEvmCall];

        expect(call.from).toBe('0x9b9fc58a24f296d04d03921550c7ffc441af34ba');
        expect(call.to).toBe('0x8bd5180ccdd7ae4af832c8c03e21ce8484a128d4'); // Newly created contract address
        expect(call.nonce).toBe(2);
        expect(call.data).toBe(
          '0x6101406040527f6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9610120526007805461ffff60a01b1916905560006008553480156200004a57600080fd5b50604051806040016040528060098152602001682d37b7b6aa37b5b2b760b91b81525080604051806040016040528060018152602001603160f81b815250604051806040016040528060098152602001682d37b7b6aa37b5b2b760b91b815250604051806040016040528060048152602001635a4f4f4d60e01b8152508160039080519060200190620000df9291906200036b565b508051620000f59060049060208401906200036b565b50506005805460ff19169055506200010d33620001b5565b815160209283012081519183019190912060c082815260e08290524660a0818152604080517f8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f8189018190528183019790975260608101959095526080808601939093523085830152805180860390920182529390920190925280519301929092209091526101005250620001af336b06765c793fa10079d00000006200020f565b62000473565b600580546001600160a01b03838116610100818102610100600160a81b031985161790945560405193909204169182907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e090600090a35050565b6001600160a01b0382166200026b5760405162461bcd60e51b815260206004820152601f60248201527f45524332303a206d696e7420746f20746865207a65726f20616464726573730060448201526064015b60405180910390fd5b620002796000838362000306565b80600260008282546200028d919062000411565b90915550506001600160a01b03821660009081526020819052604081208054839290620002bc90849062000411565b90915550506040518181526001600160a01b038316906000907fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef9060200160405180910390a35050565b60055460ff16156200034e5760405162461bcd60e51b815260206004820152601060248201526f14185d5cd8589b194e881c185d5cd95960821b604482015260640162000262565b620003668383836200036660201b620009f81760201c565b505050565b828054620003799062000436565b90600052602060002090601f0160209004810192826200039d5760008555620003e8565b82601f10620003b857805160ff1916838001178555620003e8565b82800160010185558215620003e8579182015b82811115620003e8578251825591602001919060010190620003cb565b50620003f6929150620003fa565b5090565b5b80821115620003f65760008155600101620003fb565b600082198211156200043157634e487b7160e01b81526011600452602481fd5b500190565b600181811c908216806200044b57607f821691505b602082108114156200046d57634e487b7160e01b600052602260045260246000fd5b50919050565b60805160a05160c05160e0516101005161012051611d0d620004c36000396000610dfb015260006113e8015260006114370152600061141201526000611396015260006113bf0152611d0d6000f3fe6080604052600436106101ee5760003560e01c806370a082311161010d57806395d89b41116100a0578063c8439e491161006f578063c8439e491461056d578063d505accf14610583578063dd62ed3e146105a3578063f251fc8c146105e9578063f2fde38b1461060b57600080fd5b806395d89b4114610510578063a457c2d714610525578063a6f2ae3a14610545578063a9059cbb1461054d57600080fd5b8063807dadef116100dc578063807dadef1461049b5780638456cb59146104bb5780638da5cb5b146104d057806394d95f8f146104f357600080fd5b806370a0823114610410578063715018a61461044657806379cc67901461045b5780637ecebe001461047b57600080fd5b806336ec0dd61161018557806342966c681161015457806342966c681461038257806342e94c90146103a25780635c975abb146103cf57806366f43753146103e757600080fd5b806336ec0dd61461031857806339509351146103385780633ccfd60b146103585780633f4ba83a1461036d57600080fd5b806321af6889116101c157806321af6889146102a557806323b872dd146102c7578063313ce567146102e75780633644e5151461030357600080fd5b806306fdde03146101f3578063095ea7b31461021e5780630c3f4e891461024e57806318160ddd14610286575b600080fd5b3480156101ff57600080fd5b5061020861062b565b6040516102159190611b2b565b60405180910390f35b34801561022a57600080fd5b5061023e610239366004611aea565b6106bd565b6040519015158152602001610215565b34801561025a57600080fd5b5060075461026e906001600160a01b031681565b6040516001600160a01b039091168152602001610215565b34801561029257600080fd5b506002545b604051908152602001610215565b3480156102b157600080fd5b506102c56102c0366004611aea565b6106d3565b005b3480156102d357600080fd5b5061023e6102e2366004611a3e565b61073d565b3480156102f357600080fd5b5060405160128152602001610215565b34801561030f57600080fd5b506102976107e7565b34801561032457600080fd5b506102c5610333366004611aea565b6107f6565b34801561034457600080fd5b5061023e610353366004611aea565b610853565b34801561036457600080fd5b5061023e61088f565b34801561037957600080fd5b506102c56108f6565b34801561038e57600080fd5b506102c561039d366004611b13565b610930565b3480156103ae57600080fd5b506102976103bd3660046119eb565b60096020526000908152604090205481565b3480156103db57600080fd5b5060055460ff1661023e565b3480156103f357600080fd5b506103fd6103e881565b60405161ffff9091168152602001610215565b34801561041c57600080fd5b5061029761042b3660046119eb565b6001600160a01b031660009081526020819052604090205490565b34801561045257600080fd5b506102c561093d565b34801561046757600080fd5b506102c5610476366004611aea565b610977565b34801561048757600080fd5b506102976104963660046119eb565b6109fd565b3480156104a757600080fd5b506102c56104b63660046119eb565b610a1d565b3480156104c757600080fd5b506102c5610a82565b3480156104dc57600080fd5b5060055461010090046001600160a01b031661026e565b3480156104ff57600080fd5b506102976801158e460913d0000081565b34801561051c57600080fd5b50610208610aba565b34801561053157600080fd5b5061023e610540366004611aea565b610ac9565b6102c5610b62565b34801561055957600080fd5b5061023e610568366004611aea565b610d9a565b34801561057957600080fd5b5061029760085481565b34801561058f57600080fd5b506102c561059e366004611a79565b610da7565b3480156105af57600080fd5b506102976105be366004611a0c565b6001600160a01b03918216600090815260016020908152604080832093909416825291909152205490565b3480156105f557600080fd5b506007546103fd90600160a01b900461ffff1681565b34801561061757600080fd5b506102c56106263660046119eb565b610f0b565b60606003805461063a90611c8c565b80601f016020809104026020016040519081016040528092919081815260200182805461066690611c8c565b80156106b35780601f10610688576101008083540402835291602001916106b3565b820191906000526020600020905b81548152906001019060200180831161069657829003601f168201915b5050505050905090565b60006106ca338484610fa9565b50600192915050565b6007546001600160a01b0316336001600160a01b03161461070f5760405162461bcd60e51b815260040161070690611bb3565b60405180910390fd5b6001600160a01b03821661072257600080fd5b6000811161072f57600080fd5b61073982826110cd565b5050565b600061074a8484846111b8565b6001600160a01b0384166000908152600160209081526040808320338452909152902054828110156107cf5760405162461bcd60e51b815260206004820152602860248201527f45524332303a207472616e7366657220616d6f756e74206578636565647320616044820152676c6c6f77616e636560c01b6064820152608401610706565b6107dc8533858403610fa9565b506001949350505050565b60006107f1611392565b905090565b6007546001600160a01b0316336001600160a01b0316146108295760405162461bcd60e51b815260040161070690611bb3565b6001600160a01b03821661083c57600080fd5b6000811161084957600080fd5b6107398282611485565b3360008181526001602090815260408083206001600160a01b038716845290915281205490916106ca91859061088a908690611c1e565b610fa9565b6005546000906001600160a01b036101009091041633146108c25760405162461bcd60e51b815260040161070690611b7e565b60405133904780156108fc02916000818181858888f193505050501580156108ee573d6000803e3d6000fd5b506001905090565b6005546001600160a01b036101009091041633146109265760405162461bcd60e51b815260040161070690611b7e565b61092e6115df565b565b61093a3382611485565b50565b6005546001600160a01b0361010090910416331461096d5760405162461bcd60e51b815260040161070690611b7e565b61092e6000611672565b600061098383336105be565b9050818110156109e15760405162461bcd60e51b8152602060048201526024808201527f45524332303a206275726e20616d6f756e74206578636565647320616c6c6f77604482015263616e636560e01b6064820152608401610706565b6109ee8333848403610fa9565b6109f88383611485565b505050565b6001600160a01b0381166000908152600660205260408120545b92915050565b6005546001600160a01b03610100909104163314610a4d5760405162461bcd60e51b815260040161070690611b7e565b6001600160a01b038116610a6057600080fd5b600780546001600160a01b0319166001600160a01b0392909216919091179055565b6005546001600160a01b03610100909104163314610ab25760405162461bcd60e51b815260040161070690611b7e565b61092e6116cc565b60606004805461063a90611c8c565b3360009081526001602090815260408083206001600160a01b038616845290915281205482811015610b4b5760405162461bcd60e51b815260206004820152602560248201527f45524332303a2064656372656173656420616c6c6f77616e63652062656c6f77604482015264207a65726f60d81b6064820152608401610706565b610b583385858403610fa9565b5060019392505050565b670de0b6b3a76400003410158015610b8357506801158e460913d000003411155b610be25760405162461bcd60e51b815260206004820152602a60248201527f436f6e747269627574696f6e206d757374206265206265747765656e2031206160448201526937321019181026a7ab2960b11b6064820152608401610706565b336000908152600960205260409020546801158e460913d0000090610c08903490611c1e565b1115610c695760405162461bcd60e51b815260206004820152602a60248201527f4d6178696d756d20636f6e747269627574696f6e207065722077616c6c65742060448201526934b99019181026a7ab2960b11b6064820152608401610706565b6007546103e8600160a01b90910461ffff1610801590610c96575033600090815260096020526040902054155b15610cf95760405162461bcd60e51b815260206004820152602d60248201527f4d6178696d756d206f66203130303020636f6e7472696275746f72732068617360448201526c081899595b881c995858da1959609a1b6064820152608401610706565b33600090815260096020526040902054610d4357600754610d2690600160a01b900461ffff166001611bf8565b600760146101000a81548161ffff021916908361ffff1602179055505b3360009081526009602052604081208054349290610d62908490611c1e565b90915550610d71905034611747565b60086000828254610d829190611c1e565b9091555061092e905033610d9534611747565b6110cd565b60006106ca3384846111b8565b83421115610df75760405162461bcd60e51b815260206004820152601d60248201527f45524332305065726d69743a206578706972656420646561646c696e650000006044820152606401610706565b60007f0000000000000000000000000000000000000000000000000000000000000000888888610e268c61176a565b6040805160208101969096526001600160a01b0394851690860152929091166060840152608083015260a082015260c0810186905260e0016040516020818303038152906040528051906020012090506000610e8182611792565b90506000610e91828787876117e0565b9050896001600160a01b0316816001600160a01b031614610ef45760405162461bcd60e51b815260206004820152601e60248201527f45524332305065726d69743a20696e76616c6964207369676e617475726500006044820152606401610706565b610eff8a8a8a610fa9565b50505050505050505050565b6005546001600160a01b03610100909104163314610f3b5760405162461bcd60e51b815260040161070690611b7e565b6001600160a01b038116610fa05760405162461bcd60e51b815260206004820152602660248201527f4f776e61626c653a206e6577206f776e657220697320746865207a65726f206160448201526564647265737360d01b6064820152608401610706565b61093a81611672565b6001600160a01b03831661100b5760405162461bcd60e51b8152602060048201526024808201527f45524332303a20617070726f76652066726f6d20746865207a65726f206164646044820152637265737360e01b6064820152608401610706565b6001600160a01b03821661106c5760405162461bcd60e51b815260206004820152602260248201527f45524332303a20617070726f766520746f20746865207a65726f206164647265604482015261737360f01b6064820152608401610706565b6001600160a01b0383811660008181526001602090815260408083209487168084529482529182902085905590518481527f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925910160405180910390a3505050565b6001600160a01b0382166111235760405162461bcd60e51b815260206004820152601f60248201527f45524332303a206d696e7420746f20746865207a65726f2061646472657373006044820152606401610706565b61112f60008383611989565b80600260008282546111419190611c1e565b90915550506001600160a01b0382166000908152602081905260408120805483929061116e908490611c1e565b90915550506040518181526001600160a01b038316906000907fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef9060200160405180910390a35050565b6001600160a01b03831661121c5760405162461bcd60e51b815260206004820152602560248201527f45524332303a207472616e736665722066726f6d20746865207a65726f206164604482015264647265737360d81b6064820152608401610706565b6001600160a01b03821661127e5760405162461bcd60e51b815260206004820152602360248201527f45524332303a207472616e7366657220746f20746865207a65726f206164647260448201526265737360e81b6064820152608401610706565b611289838383611989565b6001600160a01b038316600090815260208190526040902054818110156113015760405162461bcd60e51b815260206004820152602660248201527f45524332303a207472616e7366657220616d6f756e7420657863656564732062604482015265616c616e636560d01b6064820152608401610706565b6001600160a01b03808516600090815260208190526040808220858503905591851681529081208054849290611338908490611c1e565b92505081905550826001600160a01b0316846001600160a01b03167fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef8460405161138491815260200190565b60405180910390a350505050565b60007f00000000000000000000000000000000000000000000000000000000000000004614156113e157507f000000000000000000000000000000000000000000000000000000000000000090565b50604080517f00000000000000000000000000000000000000000000000000000000000000006020808301919091527f0000000000000000000000000000000000000000000000000000000000000000828401527f000000000000000000000000000000000000000000000000000000000000000060608301524660808301523060a0808401919091528351808403909101815260c0909201909252805191012090565b6001600160a01b0382166114e55760405162461bcd60e51b815260206004820152602160248201527f45524332303a206275726e2066726f6d20746865207a65726f206164647265736044820152607360f81b6064820152608401610706565b6114f182600083611989565b6001600160a01b038216600090815260208190526040902054818110156115655760405162461bcd60e51b815260206004820152602260248201527f45524332303a206275726e20616d6f756e7420657863656564732062616c616e604482015261636560f01b6064820152608401610706565b6001600160a01b0383166000908152602081905260408120838303905560028054849290611594908490611c75565b90915550506040518281526000906001600160a01b038516907fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef9060200160405180910390a3505050565b60055460ff166116285760405162461bcd60e51b815260206004820152601460248201527314185d5cd8589b194e881b9bdd081c185d5cd95960621b6044820152606401610706565b6005805460ff191690557f5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa335b6040516001600160a01b03909116815260200160405180910390a1565b600580546001600160a01b03838116610100818102610100600160a81b031985161790945560405193909204169182907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e090600090a35050565b60055460ff16156117125760405162461bcd60e51b815260206004820152601060248201526f14185d5cd8589b194e881c185d5cd95960821b6044820152606401610706565b6005805460ff191660011790557f62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a2586116553390565b600061175864174876e80083611c36565b610a1790670de0b6b3a7640000611c56565b6001600160a01b03811660009081526006602052604090208054600181018255905b50919050565b6000610a1761179f611392565b8360405161190160f01b6020820152602281018390526042810182905260009060620160405160208183030381529060405280519060200120905092915050565b60007f7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a082111561185d5760405162461bcd60e51b815260206004820152602260248201527f45434453413a20696e76616c6964207369676e6174757265202773272076616c604482015261756560f01b6064820152608401610706565b8360ff16601b148061187257508360ff16601c145b6118c95760405162461bcd60e51b815260206004820152602260248201527f45434453413a20696e76616c6964207369676e6174757265202776272076616c604482015261756560f01b6064820152608401610706565b6040805160008082526020820180845288905260ff871692820192909252606081018590526080810184905260019060a0016020604051602081039080840390855afa15801561191d573d6000803e3d6000fd5b5050604051601f1901519150506001600160a01b0381166119805760405162461bcd60e51b815260206004820152601860248201527f45434453413a20696e76616c6964207369676e617475726500000000000000006044820152606401610706565b95945050505050565b60055460ff16156109f85760405162461bcd60e51b815260206004820152601060248201526f14185d5cd8589b194e881c185d5cd95960821b6044820152606401610706565b80356001600160a01b03811681146119e657600080fd5b919050565b6000602082840312156119fc578081fd5b611a05826119cf565b9392505050565b60008060408385031215611a1e578081fd5b611a27836119cf565b9150611a35602084016119cf565b90509250929050565b600080600060608486031215611a52578081fd5b611a5b846119cf565b9250611a69602085016119cf565b9150604084013590509250925092565b600080600080600080600060e0888a031215611a93578283fd5b611a9c886119cf565b9650611aaa602089016119cf565b95506040880135945060608801359350608088013560ff81168114611acd578384fd5b9699959850939692959460a0840135945060c09093013592915050565b60008060408385031215611afc578182fd5b611b05836119cf565b946020939093013593505050565b600060208284031215611b24578081fd5b5035919050565b6000602080835283518082850152825b81811015611b5757858101830151858201604001528201611b3b565b81811115611b685783604083870101525b50601f01601f1916929092016040019392505050565b6020808252818101527f4f776e61626c653a2063616c6c6572206973206e6f7420746865206f776e6572604082015260600190565b60208082526025908201527f43616c6c6572206e6f7420617574686f72697a656420666f722074686973206160408201526431ba34b7b760d91b606082015260800190565b600061ffff808316818516808303821115611c1557611c15611cc1565b01949350505050565b60008219821115611c3157611c31611cc1565b500190565b600082611c5157634e487b7160e01b81526012600452602481fd5b500490565b6000816000190483118215151615611c7057611c70611cc1565b500290565b600082821015611c8757611c87611cc1565b500390565b600181811c90821680611ca057607f821691505b6020821081141561178c57634e487b7160e01b600052602260045260246000fd5b634e487b7160e01b600052601160045260246000fdfea26469706673582212209bc0e876c713849a7304b6fc6c0762216cf19db3eb0fa3da45a67311fa75968d64736f6c63430008040033'
        );
        expect(call.hash).toBe('0x91a0c08e72b95a7006b9bab377cf4fd4d2638d8e3fb1a4cc4e40fe2b9e703b5d');
        expect(call.blockNumber).toBe(blockNumber);
        expect(call.success).toBeTruthy();

        // Signature values
        expect(call.r).toBeDefined();
        expect(call.s).toBeDefined();
        expect(call.v).toBeDefined();

        // expect(call.blockHash).toBe('0x2af9daf4f430070aaa294baf8a5da484f0db3ffce189a89118afb99cff2d26be');
      }, 10000);

      it('can transform a failed tx', async () => {
        // https://moonriver.subscan.io/block/829253
        // https://blockscout.moonriver.moonbeam.network/blocks/829253/transactions

        const blockNumber = 829253;
        const [{extrinsics}] = await fetchBlocks(api, blockNumber, blockNumber);

        const [call] = (await processor.transformer({input: extrinsics[3], ds: baseDS, api})) as [FrontierEvmCall];

        expect(call.from).toBe('0xd3de1f8aa8e9cf7133bb65f4555f8f09cfcb7473');
        expect(call.to).toBe('0x6c8894f4582af73df96b5e802bbbabd74a7285d2');
        expect(call.nonce).toBe(221);
        expect(call.data).toBe(
          '0x3b17469e0000000000000000000000002fc54c540767d74e8b34c6c50fa448f6f25922b200000000000000000000000000000000000000000000000000000000000001a300000000000000000000000000000000000000000000000000000000000005e6'
        );
        expect(call.hash).toBe('0x31ac41e382c91de0a58dfaa275a5cdebe0499a3977cbf0f101dd9878bd6bc796');
        expect(call.blockNumber).toBe(blockNumber);
        expect(call.success).toBeFalsy();

        // Signature values
        expect(call.r).toBeDefined();
        expect(call.s).toBeDefined();
        expect(call.v).toBeDefined();

        // expect(call.blockHash).toBe('0xaadd85c55f7f8c31140f38b840cf269cdc230a8b7d8057366fbeb3a22c6de0f9');
      });

      // Failing to decode this block
      it('can transform a failed tx without execution event', async () => {
        // https://moonriver.subscan.io/block/131451
        // https://blockscout.moonriver.moonbeam.network/blocks/131451/transactions

        const moonbeamAlphaApi = await ApiPromise.create({
          provider: new WsProvider('wss://moonbeam-alpha.api.onfinality.io/public-ws'),
          typesBundle: typesBundleDeprecated as any,
        });

        const blockNumber = 131451;
        const [{extrinsics}] = await fetchBlocks(moonbeamAlphaApi, blockNumber, blockNumber);

        const [call] = (await processor.transformer({input: extrinsics[3], ds: baseDS, api: moonbeamAlphaApi})) as [
          FrontierEvmCall
        ];

        expect(call.nonce).toBe(18);
        expect(call.data).toBe(
          '0x608060405234801561001057600080fd5b506108006000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550611142806100626000396000f3fe608060405234801561001057600080fd5b50600436106101005760003560e01c80638ec67e4011610097578063d51b9e9311610066578063d51b9e9314610237578063d6362e9714610267578063d66d9e1914610285578063f69444001461028f57610100565b80638ec67e40146101d7578063a6485ccd146101f3578063b2337301146101fd578063b3b36bb31461021957610100565b80634cf088d9116100d35780634cf088d9146101895780636e5b676b146101a75780637afa9b33146101b157806382f2c8df146101bb57610100565b80630b30e0311461010557806310d526dc1461012157806318261f571461013d578063214f826814610159575b600080fd5b61011f600480360381019061011a9190610ebb565b6102ab565b005b61013b60048036038101906101369190610ebb565b61041e565b005b61015760048036038101906101529190610e56565b6104ac565b005b610173600480360381019061016e9190610e2d565b61053d565b6040516101809190610fb0565b60405180910390f35b6101916105f0565b60405161019e9190610fcb565b60405180910390f35b6101af610614565b005b6101b9610696565b005b6101d560048036038101906101d09190610e56565b610718565b005b6101f160048036038101906101ec9190610e2d565b6109c7565b005b6101fb610a55565b005b61021760048036038101906102129190610e56565b610ad7565b005b610221610b68565b60405161022e9190610f6c565b60405180910390f35b610251600480360381019061024c9190610e2d565b610b70565b60405161025e9190610fb0565b60405180910390f35b61026f610c23565b60405161027c9190611006565b60405180910390f35b61028d610cc9565b005b6102a960048036038101906102a49190610ebb565b610d4b565b005b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1663c9f593b26040518163ffffffff1660e01b815260040160206040518083038186803b15801561031157600080fd5b505afa158015610325573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906103499190610ee4565b8111156103e05760008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1663ad76ed5a826040518263ffffffff1660e01b81526004016103a99190611006565b600060405180830381600087803b1580156103c357600080fd5b505af11580156103d7573d6000803e3d6000fd5b5050505061041b565b6040517f08c379a000000000000000000000000000000000000000000000000000000000815260040161041290610fe6565b60405180910390fd5b50565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1663289b6ba7826040518263ffffffff1660e01b81526004016104779190611006565b600060405180830381600087803b15801561049157600080fd5b505af11580156104a5573d6000803e3d6000fd5b5050505050565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1663971d44c883836040518363ffffffff1660e01b8152600401610507929190610f87565b600060405180830381600087803b15801561052157600080fd5b505af1158015610535573d6000803e3d6000fd5b505050505050565b60008060009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16638e5080e7836040518263ffffffff1660e01b81526004016105999190610f6c565b60206040518083038186803b1580156105b157600080fd5b505afa1580156105c5573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906105e99190610e92565b9050919050565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1663d2f73ceb6040518163ffffffff1660e01b8152600401600060405180830381600087803b15801561067c57600080fd5b505af1158015610690573d6000803e3d6000fd5b50505050565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1663b76942196040518163ffffffff1660e01b8152600401600060405180830381600087803b1580156106fe57600080fd5b505af1158015610712573d6000803e3d6000fd5b50505050565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16638e5080e7336040518263ffffffff1660e01b81526004016107719190610f6c565b60206040518083038186803b15801561078957600080fd5b505afa15801561079d573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906107c19190610e92565b156108525760008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16634b65c34b336040518263ffffffff1660e01b815260040161081f9190610f6c565b600060405180830381600087803b15801561083957600080fd5b505af115801561084d573d6000803e3d6000fd5b505050505b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1663c9f593b26040518163ffffffff1660e01b815260040160206040518083038186803b1580156108b857600080fd5b505afa1580156108cc573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906108f09190610ee4565b81106109885760008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff166382f2c8df83836040518363ffffffff1660e01b8152600401610951929190610f87565b600060405180830381600087803b15801561096b57600080fd5b505af115801561097f573d6000803e3d6000fd5b505050506109c3565b6040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016109ba90610fe6565b60405180910390fd5b5050565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16634b65c34b826040518263ffffffff1660e01b8152600401610a209190610f6c565b600060405180830381600087803b158015610a3a57600080fd5b505af1158015610a4e573d6000803e3d6000fd5b5050505050565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1663767e04506040518163ffffffff1660e01b8152600401600060405180830381600087803b158015610abd57600080fd5b505af1158015610ad1573d6000803e3d6000fd5b50505050565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1663f6a5256983836040518363ffffffff1660e01b8152600401610b32929190610f87565b600060405180830381600087803b158015610b4c57600080fd5b505af1158015610b60573d6000803e3d6000fd5b505050505050565b600033905090565b60008060009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16638545c833836040518263ffffffff1660e01b8152600401610bcc9190610f6c565b60206040518083038186803b158015610be457600080fd5b505afa158015610bf8573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190610c1c9190610e92565b9050919050565b60008060009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1663c9f593b26040518163ffffffff1660e01b815260040160206040518083038186803b158015610c8c57600080fd5b505afa158015610ca0573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190610cc49190610ee4565b905090565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1663e8d68a376040518163ffffffff1660e01b8152600401600060405180830381600087803b158015610d3157600080fd5b505af1158015610d45573d6000803e3d6000fd5b50505050565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1663c57bd3a8826040518263ffffffff1660e01b8152600401610da49190611006565b600060405180830381600087803b158015610dbe57600080fd5b505af1158015610dd2573d6000803e3d6000fd5b5050505050565b600081359050610de8816110c7565b92915050565b600081519050610dfd816110de565b92915050565b600081359050610e12816110f5565b92915050565b600081519050610e27816110f5565b92915050565b600060208284031215610e3f57600080fd5b6000610e4d84828501610dd9565b91505092915050565b60008060408385031215610e6957600080fd5b6000610e7785828601610dd9565b9250506020610e8885828601610e03565b9150509250929050565b600060208284031215610ea457600080fd5b6000610eb284828501610dee565b91505092915050565b600060208284031215610ecd57600080fd5b6000610edb84828501610e03565b91505092915050565b600060208284031215610ef657600080fd5b6000610f0484828501610e18565b91505092915050565b610f1681611032565b82525050565b610f2581611044565b82525050565b610f348161107a565b82525050565b6000610f47600883611021565b9150610f528261109e565b602082019050919050565b610f6681611070565b82525050565b6000602082019050610f816000830184610f0d565b92915050565b6000604082019050610f9c6000830185610f0d565b610fa96020830184610f5d565b9392505050565b6000602082019050610fc56000830184610f1c565b92915050565b6000602082019050610fe06000830184610f2b565b92915050565b60006020820190508181036000830152610fff81610f3a565b9050919050565b600060208201905061101b6000830184610f5d565b92915050565b600082825260208201905092915050565b600061103d82611050565b9050919050565b60008115159050919050565b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b6000819050919050565b60006110858261108c565b9050919050565b600061109782611050565b9050919050565b7f42656c6f774d696e000000000000000000000000000000000000000000000000600082015250565b6110d081611032565b81146110db57600080fd5b50565b6110e781611044565b81146110f257600080fd5b50565b6110fe81611070565b811461110957600080fd5b5056fea26469706673582212200ecb0f46ef7628d87f3861159dc4501d58c2f386048afc421c3dd612b47328e564736f6c63430008040033'
        );
        expect(call.blockNumber).toBe(blockNumber);
        expect(call.success).toBeFalsy();

        // Signature values
        expect(call.r).toBeDefined();
        expect(call.s).toBeDefined();
        expect(call.v).toBeDefined();

        // Unfortunately we cannot get these fields without execution event
        expect(call.hash).toBe(undefined);
        expect(call.to).toBe(undefined);
        expect(call.from).toBe(undefined);
      }, 400000);

      //Interface of transaction is EthTransaction, this was always the case pre EIP1559
      it('can transform an EthTransaction', async () => {
        const moonbeamApi = await ApiPromise.create({
          provider: new WsProvider('wss://moonbeam.api.onfinality.io/public-ws'),
          typesBundle: typesBundleDeprecated as any,
        });

        const blockNumber = 415946;
        const [{extrinsics}] = await fetchBlocks(moonbeamApi, blockNumber, blockNumber);

        // https://moonbeam.subscan.io/tx/0xe2df11371c71a1372f34736ca4eefe6e6783f15592c0c7054c682020abad75c3
        const [call] = (await processor.transformer({input: extrinsics[5], ds: baseDS, api: moonbeamApi})) as [
          FrontierEvmCall
        ];

        expect(call.hash).toBe('0xe2df11371c71a1372f34736ca4eefe6e6783f15592c0c7054c682020abad75c3');
        expect(call.from).toBe('0xad54f68c34df2a9a311806b84349a06786816fd2');
        expect(call.to).toBe('0x4f4495243837681061c4743b74b3eedf548d56a5');

        expect(call.nonce).toBe(3504);
        expect(call.data).toBe(
          '0x09c5eabe00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000b000000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000003a00000000000000000000000000000000000000000000000000000000000000504000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000e000000000000000000000000000000000000000000000000000000000000001c00000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000001432f000000000000000000000000000000000000000000000000000000000001433000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000096d696e74546f6b656e000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000096d696e74546f6b656e000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000600000000000000000000000008e4b8a2c6fb0d54a5469cf297ee7747e425fe0e8000000000000000000000000000000000000000000000000000000003e5562820000000000000000000000000000000000000000000000000000000000000003555354000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000006000000000000000000000000099782d0871feca2a5f5632855cee77624e14c8d7000000000000000000000000000000000000000000000000000000003e553b7c00000000000000000000000000000000000000000000000000000000000000035553540000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000b000000000000000000000000000000000000000000000000000000000000016000000000000000000000000000000000000000000000000000000000000001e0000000000000000000000000000000000000000000000000000000000000026000000000000000000000000000000000000000000000000000000000000002e0000000000000000000000000000000000000000000000000000000000000036000000000000000000000000000000000000000000000000000000000000003e0000000000000000000000000000000000000000000000000000000000000046000000000000000000000000000000000000000000000000000000000000004e0000000000000000000000000000000000000000000000000000000000000056000000000000000000000000000000000000000000000000000000000000005e000000000000000000000000000000000000000000000000000000000000006600000000000000000000000000000000000000000000000000000000000000041a9dd61b93000cdd74f5f1a4545659252e06624d65cce17cb0dafb899652d01bf336758cbf31c2c163e9db3774b5bdd5ef236001790878b641dbd9169b22d584d1b0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000418fc28081cee7f51d03a03282fa93039e11ee808b775f56127ad14333550e1b03057f52fbc5c0c3e4e71f6d2b47291d7fff02cc872b4643e01122fd9c19f658d61c000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000041633f241e212dbc6b9e8183736d3ddb94cd5a3045f2689aabf9c2da6f4e0abb7574f8e3dc0259f7988d9c09f1bfa03d84ee9913ef977073032421f74b5a8bf98f1c000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000041c54b78b461d91d5e5d4a9fd6aaf248ae5382a6f80cc587727b16e0ea8462969f7ffbaa5303684bb1d200dbd44de834aba89afedd202b25770afda474a9b81bb11c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000418520c3638da4e66b3ddf86cd91c6496f7a8c112f1703856db63f086194157621423a029b0689f4f003fe257b7cb44c9307c51dc9f3c57cf147467a1b0af952b91c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000413435f1ed95f905b0015ff8e8f11d31248ee104bf1a8e9a390154e0cd9274d21006ff8c6392edd64d5a7af6b8d696d7fa8b448e6f96f8da1da7e3ad521180aa381b00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004167a66b1c216682e96d18d11721f62a492d4a6b3510a98df43726ff7cc22cb3dc69d5f4836441d10f1ffcd89abd6858736dabd4fdd32d585375180b14da4ab4661c000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000041f911a112f11da793ab7ed6ee150f23e3b1abd9610ee34c373eaf877f0ac6cbfb626cf33b9bfd0aa6bcae1021c19a6217bb9e892fe66d3819d02a942179ea41ea1c000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000041897fe36bdb08c3352ac34fd006b766de755f1507243eeec30df65caba15c436b489498c5b00cc88ab19c4c1812562bdbfc4ef0cfcbdcc90ee3967530c54d26071b00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004168c2d079c2efb4ccab115fec9a4295c51921206e7bac2f0f80b923618b5ba6ee76829537750f4e91aacb6e5ea1a9e543a526cfbc0346d2be59cd56b12c08c4a71c0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000416c4d5fcd6e7ed5ed337415235ef68d85c039b8476bb4ed06beb46f8633c5b09b0c81bbe281d7acbbc4b1cfdc860c39489129b7c309c0e0ec35d1109a8e0a19ec1c00000000000000000000000000000000000000000000000000000000000000'
        );
        expect(call.blockNumber).toBe(blockNumber);
        expect(call.success).toBeTruthy();
        expect(call.gasLimit.toString()).toBe('5000000');
        expect(call.gasPrice?.toString()).toBe('200000000000');

        // Signature values
        expect(call.r).toBeDefined();
        expect(call.s).toBeDefined();
        expect(call.v).toBeDefined();
      });

      // Interface of transaction is TransactionV2 and tx isLegacy ===  true
      it('can transform a legacy transaction post EIP1559', async () => {
        const moonbeamApi = await ApiPromise.create({
          provider: new WsProvider('wss://moonbeam.api.onfinality.io/public-ws'),
          typesBundle: typesBundleDeprecated as any,
        });

        const blockNumber = 459730;
        const [{extrinsics}] = await fetchBlocks(moonbeamApi, blockNumber, blockNumber);

        // https://blockscout.moonbeam.network/tx/0x31152aa4291cd46a6e2df23e9218f70c92031f6d77d6854cd2868fe5b88578ee/token-transfers
        // https://moonbeam.subscan.io/tx/0x31152aa4291cd46a6e2df23e9218f70c92031f6d77d6854cd2868fe5b88578ee
        const [call] = (await processor.transformer({input: extrinsics[3], ds: baseDS, api: moonbeamApi})) as [
          FrontierEvmCall
        ];

        expect(call.hash).toBe('0x31152aa4291cd46a6e2df23e9218f70c92031f6d77d6854cd2868fe5b88578ee');
        expect(call.from).toBe('0x9c71226863d3db3a7de3402e3743fea8026dc9e0');
        expect(call.to).toBe('0x301810bc9e485f18ae64a3e0fbed5cb3feb37679');

        expect(call.nonce).toBe(8877);
        expect(call.data).toBe(
          '0xab0a39e600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006a94d74f43000000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000001200000000000000000000000000000000000000000000000000000000000000003000000000000000000000000acc15dc74880c9944775448304b263d191c6077f000000000000000000000000818ec0a7fe18ff94269904fced6ae3dae6d6dc0b000000000000000000000000acc15dc74880c9944775448304b263d191c6077f000000000000000000000000000000000000000000000000000000000000000200000000000000000000000096b244391d98b62d19ae89b1a4dccf0fc56970c70000000000000000000000007a3909c7996efe42d425cd932fc44e3840fcab71'
        );
        expect(call.blockNumber).toBe(blockNumber);
        expect(call.success).toBeTruthy();
        expect(call.gasLimit.toString()).toBe('1000000');
        expect(call.gasPrice?.toString()).toBe('253559757068');

        // Signature values
        expect(call.r).toBeDefined();
        expect(call.s).toBeDefined();
        expect(call.v).toBeDefined();
      });

      // TOOD find a EIP1159 transaction to write a test against

      it('can transform a legacy transaction post EIP2930', async () => {
        const blockNumber = 1479105;
        const [{extrinsics}] = await fetchBlocks(api, blockNumber, blockNumber);

        //https://moonriver.subscan.io/tx/0x7a4c3eb237f49c53363e5ee77b3b4855c7a816b9d8545296bf75495d97394548

        const [call] = (await processor.transformer({input: extrinsics[5], ds: baseDS, api})) as [FrontierEvmCall];

        expect(call.hash).toBe('0x7a4c3eb237f49c53363e5ee77b3b4855c7a816b9d8545296bf75495d97394548');
        expect(call.from).toBe('0x63c41b22f7812f5149e474746564d5010c7e839d');
        expect(call.to).toBe('0x4a436073552044d5f2f49b176853ad3ad473d9d6');

        expect(call.nonce).toBe(1);
        expect(call.data).toBe(
          '0x095ea7b300000000000000000000000037f9a9436f5db1ac9e346eaab482f138da0d8749ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
        );
        expect(call.blockNumber).toBe(blockNumber);
        expect(call.success).toBeTruthy();
        expect(call.gasLimit.toString()).toBe('47281');
        expect(call.gasPrice?.toString()).toBe('1000000000');

        // Signature values
        expect(call.r).toBeDefined();
        expect(call.s).toBeDefined();
        // expect(call.v).toBeDefined(); v is undefined
      });
    });
  });
});
