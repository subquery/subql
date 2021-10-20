// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import MoonbeamDatasourcePlugin from './moonbeam';

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
      const log = {
        address: '0x6bd193ee6d2104f14f94e2ca6efefae561a4334b',
        topics: [
          '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
          '0x0000000000000000000000000000000000000000000000000000000000000000',
          '0x000000000000000000000000f884c8774b09b3302f98e38c944eb352264024f8',
        ],
        data: '0x000000000000000000000000000000000000000000000000186c6ca04ab5b16c',
        blockNumber: 752073,
        blockHash: '0x0f302f7bcfd6fac512cdfe623ef9b141becc98be0febcee94dc1f8c37a66f3f0',
        transactionIndex: 3,
        transactionHash: '0xaa84c9aa82d09bb9c969a16e4cd7de014bc737380a5c1bea6f7bf19d863ebb8b',
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
});
