// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import NodeUtil from 'node:util';
import {BigInt, Boolean, DateObj, Float, ID, Int, Json, SequelizeTypes, String} from '@subql/utils';
import {DataType, DataTypes, IndexesOptions, ModelAttributeColumnOptions, TableName, Utils} from '@subql/x-sequelize';
import {underscored} from './sync-helper';

// This method is simplified from https://github.com/sequelize/sequelize/blob/066421c00aad61694dcdbb624d4b73dbac7c7b42/packages/core/src/model-definition.ts#L245
export function modelToTableName(modelName: string): string {
  // Align underscored = true, same as in storeService sequelizeModel
  return Utils.underscoredIf(Utils.pluralize(modelName), true);
}

export function formatColumnName(columnName: string): string {
  return Utils.underscoredIf(columnName, true);
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

export function formatReferences(
  columnOptions: ModelAttributeColumnOptions,
  schema: string,
  tableName: string
): string {
  if (!columnOptions.references) {
    return '';
  }
  let referenceStatement = `REFERENCES "${schema}"."${tableName}" ("${(columnOptions?.references as any).key}")`;
  if (columnOptions.onDelete) {
    referenceStatement += ` ON DELETE ${columnOptions.onDelete}`;
  }
  if (columnOptions.onUpdate) {
    referenceStatement += ` ON UPDATE ${columnOptions.onUpdate}`;
  }
  return referenceStatement;
}

export function formatAttributes(
  columnOptions: ModelAttributeColumnOptions,
  schema: string,
  tableName: string
): string {
  const type = formatDataType(columnOptions.type);
  const allowNull = columnOptions.allowNull === false ? 'NOT NULL' : '';
  const primaryKey = columnOptions.primaryKey ? 'PRIMARY KEY' : '';
  const unique = columnOptions.unique ? 'UNIQUE' : '';
  const autoIncrement = columnOptions.autoIncrement ? 'AUTO_INCREMENT' : ''; //  PostgreSQL

  const references = formatReferences(columnOptions, schema, tableName);

  return `${type} ${allowNull} ${primaryKey} ${unique} ${autoIncrement} ${references}`.trim();
}

const sequelizeToPostgresTypeMap = {
  [DataTypes.STRING.name]: (dataType: DataType) => String.sequelizeType,
  [DataTypes.INTEGER.name]: () => Int.sequelizeType,
  [DataTypes.BIGINT.name]: () => BigInt.sequelizeType,
  [DataTypes.UUID.name]: () => ID.sequelizeType,
  [DataTypes.BOOLEAN.name]: () => Boolean.sequelizeType,
  [DataTypes.FLOAT.name]: () => Float.sequelizeType,
  [DataTypes.DATE.name]: () => DateObj.sequelizeType,
  [DataTypes.JSONB.name]: () => Json.sequelizeType,
  RANGE: () => 'int8range', // Custom handler for int8range
};

export function formatDataType(dataType: DataType): SequelizeTypes {
  if (typeof dataType === 'string') {
    return dataType;
  } else {
    const formatter = sequelizeToPostgresTypeMap[dataType.key];
    if (!formatter) {
      throw new Error(`Unsupported data type: ${dataType.key}`);
    }
    return formatter(dataType);
  }
}
