// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

function truncateObject(value: any, currentDepth: number, maxDepth: number, seen: Set<any> = new Set()): any {
  if (currentDepth >= maxDepth) {
    if (Array.isArray(value)) return `[Array(${value.length})]`;
    if (value && typeof value === 'object') return `[Object(${Object.keys(value).length})]`;
  }

  if (value && typeof value === 'object') {
    if (seen.has(value)) {
      throw new Error('Converting circular structure to JSON');
    }
    seen.add(value);

    const truncated: any = Array.isArray(value) ? [] : {};
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        truncated[key] = truncateObject(value[key], currentDepth + 1, maxDepth, seen);
      }
    }
    seen.delete(value);
    return truncated;
  }

  return value;
}

export function handledStringify(obj: any, depth = 0): string {
  try {
    if (depth > 0) {
      const limitedObj = truncateObject(obj, 0, depth);
      return JSON.stringify(limitedObj);
    }

    return JSON.stringify(obj);
  } catch (error) {
    if (error instanceof Error) {
      return error.stack || error.message;
    }
    return 'Unknown error when Stringify';
  }
}
