// Copyright 2020-2022 OnFinality Limited authors & contributors
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
import { getTypeByScalarName } from '@subql/common-avalanche';
import { GraphQLModelsType } from '@subql/common-avalanche/graphql/types';
import { ModelAttributes, ModelAttributeColumnOptions } from 'sequelize';

export function modelsTypeToModelAttributes(
  modelType: GraphQLModelsType,
  enums: Map<string, string>,
): ModelAttributes {
  const fields = modelType.fields;
  return Object.values(fields).reduce((acc, field) => {
    const allowNull = field.nullable;
    const columnOption: ModelAttributeColumnOptions<any> = {
      type: field.isEnum
        ? `${enums.get(field.type)}${field.isArray ? '[]' : ''}`
        : field.isArray
        ? getTypeByScalarName('Json').sequelizeType
        : getTypeByScalarName(field.type).sequelizeType,
      comment: field.description,
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
    if (field.type === 'Bytes') {
      columnOption.get = function () {
        const dataValue = this.getDataValue(field.name);
        if (!dataValue) {
          return null;
        }
        if (!isBuffer(dataValue)) {
          throw new Error(
            `Bytes: store.get() returned type is not buffer type`,
          );
        }
        return u8aToHex(bufferToU8a(dataValue));
      };
      columnOption.set = function (val: unknown) {
        if (val === undefined || isNull(val)) {
          this.setDataValue(field.name, null);
        } else if (isHex(val)) {
          const setValue = u8aToBuffer(hexToU8a(val));
          this.setDataValue(field.name, setValue);
        } else {
          throw new Error(
            `input for Bytes type is only support unprefixed hex`,
          );
        }
      };
    }
    acc[field.name] = columnOption;
    return acc;
  }, {} as ModelAttributes<any>);
}
