// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

describe('PgBlockRangeTransformPlugin', () => {
  function transformBlockRangeResults(results, isBlockRangeQuery) {
    if (!isBlockRangeQuery || !results || results.length === 0) {
      return results;
    }

    const groupedByBlock = {};

    results.forEach((result) => {
      const {__block_height, ...entityData} = result;

      if (__block_height) {
        const blockHeight = __block_height.toString();

        const nonIdFields = Object.entries(entityData).filter(([key]) => key !== 'id');
        const hasData = nonIdFields.some(([, value]) => value !== null);

        groupedByBlock[blockHeight] = hasData ? entityData : null;
      }
    });

    return groupedByBlock;
  }

  it('should transform block range results correctly', () => {
    const mockResults = [
      {
        __block_height: '5',
        id: 'entity1',
        name: 'First Version',
        value: 100,
      },
      {
        __block_height: '10',
        id: 'entity1',
        name: 'Second Version',
        value: 200,
      },
      {
        __block_height: '15',
        id: 'entity1',
        name: null,
        value: null,
      },
    ];

    const transformed = transformBlockRangeResults(mockResults, true);

    expect(transformed).toEqual({
      '5': {
        id: 'entity1',
        name: 'First Version',
        value: 100,
      },
      '10': {
        id: 'entity1',
        name: 'Second Version',
        value: 200,
      },
      '15': null,
    });
  });

  it('should not transform non-block-range results', () => {
    const mockResults = [
      {
        id: 'entity1',
        name: 'Regular Query',
        value: 100,
      },
    ];

    const transformed = transformBlockRangeResults(mockResults, false);
    expect(transformed).toEqual(mockResults);
  });

  it('should handle empty results', () => {
    const transformed = transformBlockRangeResults([], true);
    expect(transformed).toEqual([]);
  });

  it('should handle results without __block_height', () => {
    const mockResults = [
      {
        id: 'entity1',
        name: 'No Block Height',
        value: 100,
      },
    ];

    const transformed = transformBlockRangeResults(mockResults, true);
    expect(transformed).toEqual({});
  });

  it('should handle mixed valid and invalid results', () => {
    const mockResults = [
      {
        __block_height: '5',
        id: 'entity1',
        name: 'Valid',
        value: 100,
      },
      {
        id: 'entity2',
        name: 'Invalid',
        value: 200,
      },
      {
        __block_height: '10',
        id: 'entity3',
        name: 'Also Valid',
        value: 300,
      },
    ];

    const transformed = transformBlockRangeResults(mockResults, true);

    expect(transformed).toEqual({
      '5': {
        id: 'entity1',
        name: 'Valid',
        value: 100,
      },
      '10': {
        id: 'entity3',
        name: 'Also Valid',
        value: 300,
      },
    });
  });
});
