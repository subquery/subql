// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {
  isHex,
  hexToU8a,
  u8aToBuffer,
  u8aToHex,
  bufferToU8a,
  isBuffer,
  isNull,
} from '@polkadot/util';
import { GraphQLModelsType } from '@subql/common/graphql/types';
import { ModelAttributes, DataTypes } from 'sequelize';
import { ModelAttributeColumnOptions } from 'sequelize/types/lib/model';

const SEQUELIZE_TYPE_MAPPING = {
  ID: 'text',
  Int: 'integer',
  BigInt: 'numeric',
  String: 'text',
  Date: 'timestamp',
  BigDecimal: 'numeric',
  Boolean: 'boolean',
  Bytea: DataTypes.BLOB,
  Json: DataTypes.JSONB,
};

export function modelsTypeToModelAttributes(
  modelType: GraphQLModelsType,
): ModelAttributes<any> {
  const fields = modelType.fields;
  return Object.values(fields).reduce((acc, field) => {
    let allowNull = true;
    if (!field.nullable) {
      allowNull = false;
    }
    const columnOption: ModelAttributeColumnOptions<any> = {
      type: field.isArray
        ? SEQUELIZE_TYPE_MAPPING.Json
        : SEQUELIZE_TYPE_MAPPING[field.type],
      allowNull,
      primaryKey: field.type === 'ID',
    };
    if (field.type === 'BigInt') {
      columnOption.get = function () {
        const dataValue = this.getDataValue(field.name);
        return dataValue ? BigInt(dataValue) : null;
      };
      columnOption.set = function (val: unknown) {
        this.setDataValue(field.name, val?.toString());
      };
    }
    if (field.type === 'Bytea') {
      columnOption.get = function () {
        const dataValue = this.getDataValue(field.name);
        if (!dataValue) {
          return null;
        }
        if (!isBuffer(dataValue)) {
          throw new Error(
            `Bytea: store.get() returned type is not buffer type`,
          );
        }
        return u8aToHex(bufferToU8a(dataValue));
      };
      columnOption.set = function (val: unknown) {
        if (!val || isNull(val)) {
          this.setDataValue(field.name, null);
        } else if (isHex(val)) {
          const setValue = u8aToBuffer(hexToU8a(val));
          this.setDataValue(field.name, setValue);
        } else {
          throw new Error(
            `input for Bytea type is only support unprefixed hex`,
          );
        }
      };
    }
    acc[field.name] = columnOption;
    return acc;
  }, {} as ModelAttributes<any>);
}

export function isBasicType(t: string): boolean {
  return Object.keys(SEQUELIZE_TYPE_MAPPING).findIndex((k) => k === t) >= 0;
}
