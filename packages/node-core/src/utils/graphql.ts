// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {
  getTypeByScalarName,
  GraphQLModelsType,
  isHex,
  hexToU8a,
  u8aToBuffer,
  u8aToHex,
  bufferToU8a,
  isBuffer,
  isNull,
} from '@subql/utils';
import {ModelAttributes, ModelAttributeColumnOptions} from '@subql/x-sequelize';

export function modelsTypeToModelAttributes(modelType: GraphQLModelsType, enums: Map<string, string>): ModelAttributes {
  const fields = modelType.fields;
  return Object.values(fields).reduce((acc, field) => {
    const allowNull = field.nullable;

    const type = field.isEnum
      ? `${enums.get(field.type)}${field.isArray ? '[]' : ''}`
      : field.isArray
      ? getTypeByScalarName('Json')?.sequelizeType
      : getTypeByScalarName(field.type)?.sequelizeType;

    if (type === undefined) {
      throw new Error('Unable to get model type');
    }

    const columnOption: ModelAttributeColumnOptions<any> = {
      type,
      comment: field.description,
      allowNull,
      primaryKey: field.type === 'ID',
    };
    if (field.type === 'BigInt') {
      columnOption.get = function () {
        const dataValue = this.getDataValue(field.name);
        if (field.isArray) {
          return dataValue ? dataValue.map((v: any) => BigInt(v)) : null;
        }
        return dataValue ? BigInt(dataValue) : null;
      };
      columnOption.set = function (val: any) {
        if (field.isArray) {
          this.setDataValue(
            field.name,
            (val as any[])?.map((v) => v.toString())
          );
        } else {
          this.setDataValue(field.name, val?.toString());
        }
      };
    }
    if (field.type === 'Bytes') {
      columnOption.get = function () {
        const dataValue = this.getDataValue(field.name);
        if (!dataValue) {
          return null;
        }
        if (!isBuffer(dataValue)) {
          throw new Error(`Bytes: store.get() returned type is not buffer type`);
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
          throw new Error(`input for Bytes type is only support unprefixed hex`);
        }
      };
    }
    acc[field.name] = columnOption;
    return acc;
  }, {} as ModelAttributes<any>);
}
