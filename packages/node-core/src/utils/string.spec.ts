// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {handledStringify} from './string';

describe('handledStringify', () => {
  it('should stringify a normal object', () => {
    const obj = {key: 'value'};
    expect(handledStringify(obj)).toBe(JSON.stringify(obj));
  });

  it('should handle a circular reference error', () => {
    const obj: any = {};
    obj.circularRef = obj;
    const result = handledStringify(obj);
    expect(result).toMatch(/Converting circular structure to JSON/);
  });

  it('should handle an object with toJSON throwing an error', () => {
    const obj = {
      toJSON() {
        throw new Error('toJSON error');
      },
    };
    const result = handledStringify(obj);
    expect(result).toMatch(/Error: toJSON error/);
  });

  it('should handle unknown errors gracefully', () => {
    const obj = {
      toJSON() {
        throw 'Unknown error'; // Simulate an unknown error
      },
    };
    const result = handledStringify(obj);
    expect(result).toBe('Unknown error when Stringify');
  });

  it('should return error stack if available', () => {
    const obj = {
      toJSON() {
        throw new Error('Error with stack');
      },
    };
    const result = handledStringify(obj);
    expect(result).toMatch(/Error: Error with stack/);
  });

  it('should return error message if stack is not available', () => {
    const obj = {
      toJSON() {
        const error: any = new Error('Error without stack');
        delete error.stack;
        throw error;
      },
    };
    const result = handledStringify(obj);
    expect(result).toBe('Error without stack');
  });
});

describe('handledStringify depth', () => {
  it('Different truncation situations at various depths', () => {
    const obj = {
      key: 'value',
      child: {
        key: 'value',
        child: {
          key: 'value',
        },
        arr: [1, 2, 3],
      },
    };
    expect(handledStringify(obj, 0)).toEqual(
      '{"key":"value","child":{"key":"value","child":{"key":"value"},"arr":[1,2,3]}}'
    );
    expect(handledStringify(obj, 2)).toEqual(
      '{"key":"value","child":{"key":"value","child":"[Object(1)]","arr":"[Array(3)]"}}'
    );
    expect(handledStringify(obj, 1)).toEqual('{"key":"value","child":"[Object(3)]"}');
  });
});
