// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

// import {typesBundle} from '@acala-network/types';
import {ApiPromise, WsProvider} from '@polkadot/api';
import {getLogger} from '@subql/node/src/utils/logger';
import {fetchBlocks} from '@subql/node/src/utils/substrate';
import {SubstrateEvent, SubstrateExtrinsic} from '@subql/types';

import AcalaEvmDatasourcePlugin, {AcalaEvmCall, AcalaEvmDatasource, AcalaEvmEvent} from './acalaEvm';

const baseDS: AcalaEvmDatasource = {
  kind: 'substrate/AcalaEvm',
  assets: new Map(/*[['erc20', {file: erc20MiniAbi}]]*/),
  processor: {
    file: '',
  },
  mapping: {
    file: '',
    handlers: [
      {
        kind: 'substrate/AcalaEvmCall',
        filter: {},
        handler: 'imaginaryHandler',
      },
    ],
  },
};

const MANDALA_ENDPOINT = 'wss://mandala.polkawallet.io';

describe('AcalaDS', () => {
  jest.setTimeout(10000);

  let api: ApiPromise;

  beforeAll(async () => {
    (global as any).logger = getLogger('MoonbeamTests');
    api = await ApiPromise.create({
      provider: new WsProvider(MANDALA_ENDPOINT),
      // typesBundle: typesBundle as any,
    });
  });

  describe('AcalaEvmEvent', () => {
    const processor = AcalaEvmDatasourcePlugin.handlerProcessors['substrate/AcalaEvmEvent'];

    describe('Filtering', () => {
      let event: SubstrateEvent;

      beforeEach(async () => {
        const blockNumber = 927886;
        const [{events}] = await fetchBlocks(api, blockNumber, blockNumber);

        event = events[12];
      });

      it('filters matching address', () => {
        expect(
          processor.filterProcessor({
            filter: {},
            input: event,
            ds: {
              processor: {options: {address: '0x0e696947a06550def604e82c26fd9e493e576337'}},
            } as AcalaEvmDatasource,
          })
        ).toBeTruthy();

        expect(
          processor.filterProcessor({
            filter: {},
            input: event,
            ds: {
              processor: {options: {address: '0x0000000000000000000000000000000000000000'}},
            } as AcalaEvmDatasource,
          })
        ).toBeFalsy();
      });

      it('filters topics', () => {
        expect(
          processor.filterProcessor({
            filter: {},
            input: event,
            ds: {} as AcalaEvmDatasource,
          })
        ).toBeTruthy();
        expect(
          processor.filterProcessor({
            filter: {topics: ['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef']},
            input: event,
            ds: {} as AcalaEvmDatasource,
          })
        ).toBeTruthy();

        expect(
          processor.filterProcessor({
            filter: {topics: ['Transfer(address indexed from, address indexed to, uint256 value)']},
            input: event,
            ds: {} as AcalaEvmDatasource,
          })
        ).toBeTruthy();

        expect(
          processor.filterProcessor({
            filter: {topics: ['Transfer(address from, address to, uint256 value)']},
            input: event,
            ds: {} as AcalaEvmDatasource,
          })
        ).toBeTruthy();

        expect(
          processor.filterProcessor({
            filter: {topics: ['0x6bd193ee6d2104f14f94e2ca6efefae561a4334b']},
            input: event,
            ds: {} as AcalaEvmDatasource,
          })
        ).toBeFalsy();
      });

      it('filters multiple topics', () => {
        expect(
          processor.filterProcessor({
            filter: {
              topics: [
                'Transfer(address from, address to, uint256 value)',
                '0x00000000000000000000000090f8bf6a479f320ead074411a4b0e7944ea8c9c1',
              ],
            },
            input: event,
            ds: {} as AcalaEvmDatasource,
          })
        ).toBeTruthy();

        expect(
          processor.filterProcessor({
            filter: {
              topics: [
                'Transfer(address from, address to, uint256 value)',
                '0x00000000000000000000000090f8bf6a479f320ead074411a4b0e7944ea8c9c1',
                '0x0000000000000000000000002932516d9564cb799dda2c16559cad5b8357a0d6',
              ],
            },
            input: event,
            ds: {} as AcalaEvmDatasource,
          })
        ).toBeTruthy();

        expect(
          processor.filterProcessor({
            filter: {
              topics: [
                'Transfer(address from, address to, uint256 value)',
                null,
                '0x0000000000000000000000002932516d9564cb799dda2c16559cad5b8357a0d6',
              ],
            },
            input: event,
            ds: {} as AcalaEvmDatasource,
          })
        ).toBeTruthy();

        expect(
          processor.filterProcessor({
            filter: {
              topics: [
                'Transfer(address from, address to, uint256 value)',
                '0x90f8bf6a479f320ead074411a4b0e7944ea8c9c1',
                '0x2932516d9564cb799dda2c16559cad5b8357a0d6',
              ],
            },
            input: event,
            ds: {} as AcalaEvmDatasource,
          })
        ).toBeTruthy();
      });

      it('filters with multiple events', async () => {
        const blockNumber = 1066694;
        const [{events}] = await fetchBlocks(api, blockNumber, blockNumber);
        const evt = events[12];

        expect(
          processor.filterProcessor({
            filter: {topics: ['0x7835cd24e2804ab5cb4f4a613f38e83f9c79ca4b42b58beef4faf77de9e50c35']},
            input: evt,
            ds: {} as AcalaEvmDatasource,
          })
        ).toBeTruthy();
      });
    });

    describe('Transforming', () => {
      it('can transform a call tx', async () => {
        // https://blockscout.mandala.acala.network/tx/0xd787820fac4060a14cd130989d0e38d43b5051cb964ac23bca5f834d4d625087/logs
        // https://acala-testnet.subscan.io/extrinsic/1016071-2
        const blockNumber = 1016071;
        const [{events}] = await fetchBlocks(api, blockNumber, blockNumber);

        const [event] = (await processor.transformer({input: events[12], ds: baseDS, api})) as [AcalaEvmEvent];

        expect(event.address).toBe('0x02887684a79593677d7f076c84043b94cbe01fea');
        expect(event.transactionIndex).toBe(2);
        expect(event.transactionHash).toBe('0xd787820fac4060a14cd130989d0e38d43b5051cb964ac23bca5f834d4d625087');
        expect(event.logIndex).toBe(0);
        expect(event.blockNumber).toBe(blockNumber);
        expect(event.data).toBe(
          '0x000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000383f856ab7100000000000000000000000000000000000000000000000000000000627055ce00000000000000000000000000000000000000000000000000000000000000074254432f55534400000000000000000000000000000000000000000000000000'
        );
        expect(event.topics[0]).toBe('0xa7fc99ed7617309ee23f63ae90196a1e490d362e6f6a547a59bc809ee2291782');

        // TODO
        // expect(event.args.from).toBe('0x4467a4b51f507083cccbf06dd28097848506d56b');
        // expect(event.args.to).toBe('0xf884c8774b09b3302f98e38C944eB352264024F8');
        // expect(event.args.value.toString()).toBe('0');
      });

      it('can transform relevant logs', async () => {
        const blockNumber = 1066694;
        const [{events}] = await fetchBlocks(api, blockNumber, blockNumber);
        const evt = events[12];

        const transformed = (await processor.transformer({
          input: evt,
          ds: baseDS,
          filter: {topics: ['0x7835cd24e2804ab5cb4f4a613f38e83f9c79ca4b42b58beef4faf77de9e50c35']},
          api,
        })) as AcalaEvmEvent[];

        expect(transformed.length).toEqual(1);
      });
    });
  });

  describe('AcalaEvmCall', () => {
    const processor = AcalaEvmDatasourcePlugin.handlerProcessors['substrate/AcalaEvmCall'];

    describe('Filtering', () => {
      let extrinsic: SubstrateExtrinsic;

      beforeEach(async () => {
        // https://blockscout.mandala.acala.network/tx/0xa26f53087bcabc9cb74cac6fceed13154d00fa7c76267dfd250791f4d98b03be
        // https://acala-testnet.subscan.io/extrinsic/1018768-2
        const blockNumber = 1018768;
        const [{extrinsics}] = await fetchBlocks(api, blockNumber, blockNumber);

        extrinsic = extrinsics[2];
      });

      it('filters matching address', () => {
        expect(
          processor.filterProcessor({
            filter: {},
            input: extrinsic,
            ds: {
              processor: {options: {address: '0x02887684a79593677d7f076c84043b94cbe01fea'}},
            } as AcalaEvmDatasource,
          })
        ).toBeTruthy();

        expect(
          processor.filterProcessor({
            filter: {},
            input: extrinsic,
            ds: {
              processor: {options: {address: '0x0000000000000000000000000000000000000000'}},
            } as AcalaEvmDatasource,
          })
        ).toBeFalsy();
      });

      it('can filter from', () => {
        expect(
          processor.filterProcessor({
            filter: {from: '0x4467a4b51f507083cccbf06dd28097848506d56b'},
            input: extrinsic,
            ds: {} as AcalaEvmDatasource,
          })
        ).toBeTruthy();
        expect(
          processor.filterProcessor({
            filter: {from: '0x0000000000000000000000000000000000000000'},
            input: extrinsic,
            ds: {} as AcalaEvmDatasource,
          })
        ).toBeFalsy();
      });

      it('can filter function with signature', () => {
        expect(
          processor.filterProcessor({
            filter: {function: 'setValue(string key, uint128 value, uint128 timestamp)'},
            input: extrinsic,
            ds: {} as AcalaEvmDatasource,
          })
        ).toBeTruthy();
        expect(
          processor.filterProcessor({
            filter: {function: 'transfer(address to, address from)'},
            input: extrinsic,
            ds: {} as AcalaEvmDatasource,
          })
        ).toBeFalsy();
      });
    });

    describe('Transforming', () => {
      it('can transform a call tx', async () => {
        // https://blockscout.mandala.acala.network/tx/0xd787820fac4060a14cd130989d0e38d43b5051cb964ac23bca5f834d4d625087/logs
        // https://acala-testnet.subscan.io/extrinsic/1016071-2
        const blockNumber = 1016071;
        const [{extrinsics}] = await fetchBlocks(api, blockNumber, blockNumber);

        const [call] = (await processor.transformer({input: extrinsics[2], ds: baseDS, api})) as [AcalaEvmCall];

        expect(call.from).toBe('0x4467a4b51f507083cccbf06dd28097848506d56b');
        expect(call.to).toBe('0x02887684a79593677d7f076c84043b94cbe01fea');
        expect(call.nonce).toBe(3713);
        expect(call.data).toBe(
          '0x7898e0c2000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000383f856ab7100000000000000000000000000000000000000000000000000000000627055ce00000000000000000000000000000000000000000000000000000000000000074254432f55534400000000000000000000000000000000000000000000000000'
        );
        expect(call.hash).toBe('0xd787820fac4060a14cd130989d0e38d43b5051cb964ac23bca5f834d4d625087');
        expect(call.blockNumber).toBe(blockNumber);
        expect(call.success).toBeTruthy();
        expect(call.value.toString()).toBe('0');

        expect(call.gasLimit.toString()).toBe('648725');
        // TODO test gas price
        // expect(call.gasPrice.toString()).toBe('1297652498616');

        // TODO test abi parsing
      });

      it('can transform a failed call tx', async () => {
        // https://blockscout.mandala.acala.network/tx/0xd787820fac4060a14cd130989d0e38d43b5051cb964ac23bca5f834d4d625087/logs
        // https://acala-testnet.subscan.io/extrinsic/965354-2
        const blockNumber = 965354;
        const [{extrinsics}] = await fetchBlocks(api, blockNumber, blockNumber);

        const [call] = (await processor.transformer({input: extrinsics[2], ds: baseDS, api})) as [AcalaEvmCall];

        expect(call.from).toBe('0x70997970c51812dc3a010c7d01b50e0d17dc79c8');
        expect(call.to).toBe('0x29803effe29eb4b24008fd75a6bbcb7a23724888');
        expect(call.nonce).toBe(1);
        expect(call.data).toBe('0x');
        expect(call.hash).toBe('0x4dc2a07fb274f5fec6db3f43d310ce79a4f6e63d4ade02abd3dc1e0276a6370b');
        expect(call.blockNumber).toBe(blockNumber);
        expect(call.success).toBeFalsy();
        expect(call.value.toString()).toBe('890000000000000000');

        expect(call.gasLimit.toString()).toBe('22312');
        // TODO test gas price
        // expect(call.gasPrice.toString()).toBe('1297652498616');
      });
    });
  });

  // TODO test filtering calls and events
});
