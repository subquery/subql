// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

export function jsonToTable<T extends Record<string, any>>(input: T[]): string {
  if (!input || input.length === 0) {
    return '';
  }

  // Extract all unique keys from all objects
  const keys = Array.from(new Set(input.flatMap((item) => Object.keys(item))));

  const toString = (value: any): string => {
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  };

  if (keys.length === 0) {
    return '';
  }

  // Get the maximum width needed for each column
  const columnWidths: Record<string, number> = {};
  keys.forEach((key) => {
    // Initialize with header length
    columnWidths[key] = key.length;

    // Check each value's string length and update if longer
    input.forEach((item) => {
      if (item[key] !== undefined && item[key] !== null) {
        const valueLength = toString(item[key]).length;
        if (valueLength > columnWidths[key]) {
          columnWidths[key] = valueLength;
        }
      }
    });
  });

  // Create header row
  const header = keys.map((key) => key.padEnd(columnWidths[key])).join(' | ');

  // Create separator row
  const separator = keys.map((key) => '-'.repeat(columnWidths[key])).join('-|-');

  // Create data rows
  const rows = input.map((item) => {
    return keys
      .map((key) => {
        const value = item[key] === undefined || item[key] === null ? '' : toString(item[key]);
        return value.padEnd(columnWidths[key]);
      })
      .join(' | ');
  });

  // Combine all rows into the final table
  return [header, separator, ...rows].join('\n');
}
