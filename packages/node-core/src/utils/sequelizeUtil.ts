// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import NodeUtil from 'node:util';
import {IndexesOptions, TableName, Utils} from '@subql/x-sequelize';
import Pino from 'pino';
import {underscored} from './sync-helper';

// This method is simplified from https://github.com/sequelize/sequelize/blob/066421c00aad61694dcdbb624d4b73dbac7c7b42/packages/core/src/model-definition.ts#L245
export function modelToTableName(modelName: string): string {
  // Align underscored = true, same as in storeService sequelizeModel
  return Utils.underscoredIf(Utils.pluralize(modelName), true);
}

// Rewrite due to method is not exported from sequelize
// This method is same from https://github.com/sequelize/sequelize/blob/26beda5bf76bd65e30264ebf135e39efaa7d514d/packages/core/src/utils/string.ts#L89
export function generateIndexName(tableName: TableName, index: IndexesOptions): string {
  if (typeof tableName !== 'string' && tableName.tableName) {
    tableName = tableName.tableName;
  }
  if (!index.fields) {
    throw new Error(`Index on table ${tableName} has not fields:
${NodeUtil.inspect(index)}`);
  }

  const fields = index.fields.map((field) => {
    // We always pass string in indexes field
    if (typeof field === 'string') {
      return field;
    }
    throw new Error(`Generate index name failed, index ${index.name} field should be string type`);
  });

  let out = `${tableName}_${fields.join('_')}`;

  if (index.unique) {
    out += '_unique';
  }
  return underscored(out);
}
