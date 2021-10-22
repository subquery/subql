// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {BigNumber} from '@ethersproject/bignumber';
import MoonbeamDatasourcePlugin, {MoonbeamCall, MoonbeamEvent} from './moonbeam';

describe('MoonbeamDs', () => {
  describe('MoonbeamEvent', () => {
    const processor = MoonbeamDatasourcePlugin.handlerProcessors['substrate/MoonbeamEvent'];

    describe('Filter Validation', () => {
      it('validates with no filter', () => {
        expect(() => processor.filterValidator(undefined)).not.toThrow();
      });

      it('validates with only an address', () => {
        expect(() => processor.filterValidator({address: '0x6bd193ee6d2104f14f94e2ca6efefae561a4334b'})).not.toThrow();
      });

      it('validates with only topics', () => {
        expect(() =>
          processor.filterValidator({topics: ['0x6bd193ee6d2104f14f94e2ca6efefae561a4334b', null]})
        ).not.toThrow();
      });

      it('validates topics with OR option', () => {
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

      it('checks OR topics are valid hex strings', () => {
        expect(() => processor.filterValidator({topics: [['Hello', 'World']]})).toThrow();
      });
    });

    describe('Filter Processor', () => {
      const log: MoonbeamEvent = {
        address: '0x6bd193ee6d2104f14f94e2ca6efefae561a4334b',
        topics: [
          '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
          '0x0000000000000000000000000000000000000000000000000000000000000000',
          '0x000000000000000000000000f884c8774b09b3302f98e38c944eb352264024f8',
        ],
        data: '0x000000000000000000000000000000000000000000000000186c6ca04ab5b16c',
        blockNumber: 752073,
        blockHash: '0x2ddc48977ab437df79ed1df813125d3654e192f1fa3bc997e5f90c80f64d7d91',
        transactionIndex: 3,
        transactionHash: '0x3a829a14031a74a4b3e212c26247d8d8e6599c9a9f927196e90ffce266402954',
        removed: false,
        logIndex: 4,
      };

      it('filters just a matching address', () => {
        expect(
          processor.filterProcessor({address: '0x6bd193ee6d2104f14f94e2ca6efefae561a4334b'}, log, undefined)
        ).toBeTruthy();
      });

      it('filters just a non-matching address', () => {
        expect(processor.filterProcessor({address: '0x00'}, log, undefined)).toBeFalsy();
      });

      it('filters topics matching 1', () => {
        expect(
          processor.filterProcessor(
            {topics: ['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef']},
            log,
            undefined
          )
        ).toBeTruthy();
      });

      it('filters topics matching 2', () => {
        expect(
          processor.filterProcessor(
            {topics: [null, null, '0x000000000000000000000000f884c8774b09b3302f98e38c944eb352264024f8']},
            log,
            undefined
          )
        ).toBeTruthy();
      });

      it('filters topics matching 3', () => {
        expect(
          processor.filterProcessor(
            {
              topics: [
                '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
                null,
                '0x000000000000000000000000f884c8774b09b3302f98e38c944eb352264024f8',
              ],
            },
            log,
            undefined
          )
        ).toBeTruthy();
      });

      it('filters topics matching 4', () => {
        expect(
          processor.filterProcessor(
            {topics: [['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef', '0x00']]},
            log,
            undefined
          )
        ).toBeTruthy();
      });

      it('filters topics matching with event', () => {
        expect(
          processor.filterProcessor(
            {topics: [['Transfer(address indexed from, address indexed to, uint256 value)']]},
            log,
            undefined
          )
        ).toBeTruthy();

        expect(
          processor.filterProcessor({topics: [['Transfer(address from, address to, uint256 value)']]}, log, undefined)
        ).toBeTruthy();

        expect(
          processor.filterProcessor({topics: [['Transfer(address, address, uint256)']]}, log, undefined)
        ).toBeTruthy();
      });

      it('filters topics NOT matching 1', () => {
        expect(
          processor.filterProcessor({topics: ['0x6bd193ee6d2104f14f94e2ca6efefae561a4334b']}, log, undefined)
        ).toBeFalsy();
      });

      it('filters topics NOT matching 2', () => {
        expect(
          processor.filterProcessor(
            {
              topics: [
                '0x6bd193ee6d2104f14f94e2ca6efefae561a4334b',
                null,
                '0x000000000000000000000000f884c8774b09b3302f98e38c944eb352264024f8',
              ],
            },
            log,
            undefined
          )
        ).toBeFalsy();
      });

      it('filters topics without zero padding', () => {
        expect(
          processor.filterProcessor(
            {topics: [null, null, '0xf884c8774b09b3302f98e38c944eb352264024f8']},
            log,
            undefined
          )
        ).toBeTruthy();
      });
    });
  });

  describe('MoonbeamCall', () => {
    const processor = MoonbeamDatasourcePlugin.handlerProcessors['substrate/MoonbeamCall'];

    describe('Filter Processor', () => {
      const transaction: MoonbeamCall = {
        from: '0x0a3f21A6B1B93f15F0d9Dbf0685e3dFdC4889EB0',
        to: '0xAA30eF758139ae4a7f798112902Bf6d65612045f',
        data: '0x7ff36ab5000000000000000000000000000000000000000000000000000000003f71d93b00000000000000000000000000000000000000000000000000000000000000800000000000000000000000000a3f21a6b1b93f15f0d9dbf0685e3dfdc4889eb00000000000000000000000000000000000000000000000000000000061708a44000000000000000000000000000000000000000000000000000000000000000200000000000000000000000098878b06940ae243284ca214f92bb71a2b032b8a000000000000000000000000e3f5a90f9cb311505cd691a46596599aa1a0ad7d',
        value: BigNumber.from(0),
        nonce: 3378,
        hash: '0xd2e478f9159967a2c4e70c28d07a62126165ea39127a579aaf18f17d58de180c',
        blockNumber: 763971,
        blockHash: '0xfe3bd9d990b3320afdc61e2e78e06801c1adcb20c308825994804c5fa5a283a9',
        timestamp: Math.round(new Date().getTime() / 1000),
        gasPrice: BigNumber.from('2875000000'),
        gasLimit: BigNumber.from(300000),
        chainId: 0,
      };

      it('can filter from', () => {
        expect(
          processor.filterProcessor({from: '0x0a3f21A6B1B93f15F0d9Dbf0685e3dFdC4889EB0'}, transaction, undefined)
        ).toBeTruthy();
        expect(
          processor.filterProcessor({from: '0x0000000000000000000000000000000000000000'}, transaction, undefined)
        ).toBeFalsy();
      });

      it('can filter to', () => {
        expect(
          processor.filterProcessor({to: '0xAA30eF758139ae4a7f798112902Bf6d65612045f'}, transaction, undefined)
        ).toBeTruthy();
        expect(
          processor.filterProcessor({to: '0x0000000000000000000000000000000000000000'}, transaction, undefined)
        ).toBeFalsy();
      });

      it('can filter for contract creation', () => {
        const contractTx = {...transaction};
        delete contractTx.to;
        expect(processor.filterProcessor({to: null}, contractTx, undefined)).toBeTruthy();
        expect(processor.filterProcessor({to: null}, {...contractTx, to: undefined}, undefined)).toBeTruthy();
      });

      it('can filter function with signature', () => {
        expect(
          processor.filterProcessor(
            {function: 'swapExactETHForTokens(uint256 amountOutMin, address[] path, address to, uint256 deadline)'},
            transaction,
            undefined
          )
        ).toBeTruthy();
        expect(
          processor.filterProcessor(
            {function: 'swapExactETHForTokens(uint256, address[], address, uint256)'},
            transaction,
            undefined
          )
        ).toBeTruthy();
      });

      it('can filter function with method id', () => {
        expect(
          processor.filterProcessor(
            {function: '0x7ff36ab500000000000000000000000000000000000000000000000000000000'},
            transaction,
            undefined
          )
        ).toBeTruthy();
        expect(processor.filterProcessor({function: '0x7ff36ab5'}, transaction, undefined)).toBeTruthy();

        expect(processor.filterProcessor({function: '0x0000000'}, transaction, undefined)).toBeFalsy();
      });
    });
  });
});
