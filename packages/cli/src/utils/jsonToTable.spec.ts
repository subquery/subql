// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {jsonToTable} from './jsonToTable';

describe('jsonToTable', () => {
  it('should return empty string for empty array', () => {
    expect(jsonToTable([])).toBe('');
  });

  it('should format a simple array of objects into a table', () => {
    const input = [
      {name: 'Alice', age: 30},
      {name: 'Bob', age: 25},
    ];

    const expected = 'name  | age\n' + '------|----\n' + 'Alice | 30 \n' + 'Bob   | 25 ';

    expect(jsonToTable(input)).toBe(expected);
  });

  it('should handle objects with different keys', () => {
    const input = [
      {name: 'Alice', age: 30},
      {name: 'Bob', role: 'Developer'},
      {id: 123, name: 'Charlie'},
    ];

    const expected =
      'name    | age | role      | id \n' +
      '--------|-----|-----------|----\n' +
      'Alice   | 30  |           |    \n' +
      'Bob     |     | Developer |    \n' +
      'Charlie |     |           | 123';

    expect(jsonToTable(input)).toBe(expected);
  });

  it('should handle various data types', () => {
    const input = [
      {id: 1, enabled: true, data: {nested: 'value'}},
      {id: 2, enabled: false, data: null},
    ];

    const expected =
      'id | enabled | data              \n' +
      '---|---------|-------------------\n' +
      '1  | true    | {"nested":"value"}\n' +
      '2  | false   |                   ';

    expect(jsonToTable(input)).toBe(expected);
  });
});
