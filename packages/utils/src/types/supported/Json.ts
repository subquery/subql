// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {DataTypes} from '@subql/x-sequelize';
import {TypeClass} from '../TypeClass';

// Function to sort object properties
// If array is provide, return same array, but sort json properties in each object
// If JSON object only, sort its properties
function sortJsonObjectProperties(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map((item) => sortJsonObjectProperties(item)).sort();
  } else if (obj && typeof obj === 'object' && obj.constructor === Object) {
    const sortedObj: any = {};
    Object.keys(obj)
      .sort()
      .forEach((key) => {
        const value = sortJsonObjectProperties(obj[key]);
        if (value !== undefined) {
          sortedObj[key] = value;
        }
      });
    return sortedObj;
  }
  return obj;
}

export const Json = new TypeClass(
  'Json',
  (data: unknown): Uint8Array => {
    return Buffer.from(JSON.stringify(sortJsonObjectProperties(data)));
  },
  undefined,
  undefined,
  DataTypes.JSONB
);
