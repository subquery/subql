// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {makeRangeQuery, makeBlockRangeQuery, extractBlockHeightFromRange} from './utils';

describe('Historical Utils', () => {
  const mockSql = {
    fragment: (template: TemplateStringsArray, ...values: any[]) => {
      return template.reduce((result, string, i) => {
        return result + string + (values[i] ? `{${values[i]}}` : '');
      }, '');
    },
    value: (val: any) => val,
  };

  const mockTableName = mockSql.fragment`test_table` as any;
  const mockBlockHeight = mockSql.fragment`100` as any;

  describe('makeRangeQuery', () => {
    it('should create correct range query for single block height', () => {
      const result = makeRangeQuery(mockTableName, mockBlockHeight, mockSql);
      expect(result).toContain('_block_range @>');
      expect(result).toContain('{100}');
    });
  });

  describe('makeBlockRangeQuery', () => {
    it('should create correct range query for block range', () => {
      const blockRange: [string, string] = ['5', '15'];
      const result = makeBlockRangeQuery(mockTableName, blockRange, mockSql);

      expect(result).toContain('_block_range &&');
      expect(result).toContain('int8range');
      expect(result).toContain('{5}');
      expect(result).toContain('{15}');
      expect(result).toContain("'[]'");
    });

    it('should handle different block range values', () => {
      const blockRange: [string, string] = ['0', '1000'];
      const result = makeBlockRangeQuery(mockTableName, blockRange, mockSql);

      expect(result).toContain('{0}');
      expect(result).toContain('{1000}');
    });
  });

  describe('extractBlockHeightFromRange', () => {
    it('should create correct PostgreSQL lower() function call', () => {
      const columnName = 'test_table._block_range';
      const result = extractBlockHeightFromRange(columnName);

      expect(result).toBe('lower(test_table._block_range)');
    });

    it('should work with different column names', () => {
      const columnName = 'alias._block_range';
      const result = extractBlockHeightFromRange(columnName);

      expect(result).toBe('lower(alias._block_range)');
    });
  });
});
