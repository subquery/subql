// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {makeRangeQuery, hasBlockRange} from './utils';

describe('PgBlockHeightPlugin utilities', () => {
  describe('makeRangeQuery', () => {
    it('should create range query for block height', () => {
      const mockTableName = {text: 'test_table'} as any;
      const mockBlockHeight = {text: '12345'} as any;
      const mockSql = {
        fragment: (template: TemplateStringsArray, ...values: any[]) => ({
          text: template.join('?'),
          values,
        }),
      };

      const result = makeRangeQuery(mockTableName, mockBlockHeight, mockSql);
      expect(result).toBeDefined();
    });

    it('should create range query for block range', () => {
      const mockTableName = {text: 'test_table'} as any;
      const mockBlockRange = {text: '[1000, 2000]'} as any;
      const mockSql = {
        fragment: (template: TemplateStringsArray, ...values: any[]) => ({
          text: template.join('?'),
          values,
        }),
      };

      const result = makeRangeQuery(mockTableName, mockBlockRange, mockSql, true);
      expect(result).toBeDefined();
    });
  });

  describe('hasBlockRange', () => {
    it('should return true for entity with _block_range attribute', () => {
      const mockEntity = {
        kind: 'class' as any,
        attributes: [{name: '_block_range'}, {name: 'id'}],
      } as any;

      const result = hasBlockRange(mockEntity);
      expect(result).toBe(true);
    });

    it('should return false for entity without _block_range attribute', () => {
      const mockEntity = {
        kind: 'class' as any,
        attributes: [{name: 'id'}, {name: 'name'}],
      } as any;

      const result = hasBlockRange(mockEntity);
      expect(result).toBe(false);
    });

    it('should return true for undefined entity', () => {
      const result = hasBlockRange(undefined);
      expect(result).toBe(true);
    });
  });
});
