// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
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
  GraphQLEntityField,
} from '@subql/utils';
import {ModelAttributes, ModelAttributeColumnOptions} from '@subql/x-sequelize';
import {isArray} from 'lodash';
import {enumNameToHash} from '../db';

export interface EnumType {
  enumValues: string[];
  name?: string;
  type?: string;
}

export function modelsTypeToModelAttributes(
  modelType: GraphQLModelsType,
  enums: Map<string, EnumType>,
  schema: string
): ModelAttributes {
  const fields = modelType.fields;
  return Object.values(fields).reduce((acc, field) => {
    acc[field.name] = getColumnOption(field, enums, schema);
    return acc;
  }, {} as ModelAttributes<any>);
}

export function getColumnOption(
  field: GraphQLEntityField,
  enums: Map<string, EnumType>,
  schema: string
): ModelAttributeColumnOptions {
  const allowNull = field.nullable;

  let enumType: string | null = null;
  if (field.isEnum) {
    const enumTypeName = enumNameToHash(field.type);
    const enumTypeNameDeprecated = `${schema}_enum_${enumNameToHash(field.type)}`;

    [enumTypeName, enumTypeNameDeprecated].forEach((t) => {
      if (enums.has(t)) {
        enumType = t === enumTypeNameDeprecated ? `"${t}"` : `"${schema}"."${enumTypeName}"`;
      }
    });
  }

  if (field.isEnum && !enumType) throw new Error('Unable to get enum type');

  const type = field.isEnum
    ? `${enumType}${field.isArray ? '[]' : ''}`
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
  if (field.isArray && field.jsonInterface) {
    const bigIntFields = field.jsonInterface?.fields.filter((f) => f.type === 'BigInt');

    columnOption.get = function () {
      const arrayDataValue = this.getDataValue(field.name);
      return arrayDataValue && field.jsonInterface
        ? arrayDataValue.map((o: any) => {
            if (bigIntFields && bigIntFields.length) {
              for (const bigIntField of bigIntFields) {
                o[bigIntField.name] = BigInt(o[bigIntField.name]);
              }
            }
            return o;
          })
        : [];
    };
    columnOption.set = function (val: unknown) {
      if (val === undefined || isNull(val)) {
        this.setDataValue(field.name, null);
      } else if (isArray(val)) {
        if (val.length === 0) {
          return [];
        }
        const setValue = val.map((v: any) => {
          if (bigIntFields && bigIntFields.length) {
            for (const bigIntField of bigIntFields) {
              v[bigIntField.name] = `0x${v[bigIntField.name].toString(16)}`;
            }
          }
          return v;
        });
        this.setDataValue(field.name, setValue);
      } else {
        throw new Error(`input for json ${field.jsonInterface?.name} array type is only support array`);
      }
    };
  }
  return columnOption;
}
