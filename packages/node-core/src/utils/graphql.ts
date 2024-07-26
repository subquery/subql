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
  GraphQLJsonFieldType,
} from '@subql/utils';
import {ModelAttributes, ModelAttributeColumnOptions} from '@subql/x-sequelize';
import {isArray, isObject} from 'lodash';
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
    : field.isArray || field.jsonInterface
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
  if (field.jsonInterface) {
    columnOption.get = function () {
      const dataValue = this.getDataValue(field.name);

      if (!dataValue || !field.jsonInterface) {
        return null;
      }
      return field.isArray ? dataValue.map((v: any) => processGetJson(field, v)) : processGetJson(field, dataValue);
    };
    columnOption.set = function (val: unknown) {
      if (val === undefined || isNull(val)) {
        this.setDataValue(field.name, null);
        return;
      }
      if (isArray(val)) {
        const setValue = val.length === 0 ? [] : val.map((v) => processSetJson(v));
        this.setDataValue(field.name, setValue);
      } else if (isObject(val)) {
        this.setDataValue(field.name, processSetJson(val));
      } else {
        throw new Error(`input for Json type only supports object or array, received type ${typeof val}`);
      }
    };
  }
  return columnOption;
}

/***
 * Process nested json get, output is same as input value type
 * @param field
 * @param value
 */
function processGetJson(field: GraphQLEntityField | GraphQLJsonFieldType, value: any): any {
  // bigIntFields and nestJsonFields from this level in the entity/json
  const bigIntFields = field.jsonInterface?.fields.filter((f) => f.type === 'BigInt');
  const nestJsonFields = field.jsonInterface?.fields.filter((f) => f.jsonInterface);
  const processBigIntFields = (value: any) => {
    if (bigIntFields) {
      for (const bigIntField of bigIntFields) {
        // If null is passed, we should not convert it to BigInt
        if (value[bigIntField.name] !== undefined && value[bigIntField.name] !== null) {
          value[bigIntField.name] = BigInt(value[bigIntField.name].slice(0, -1));
        }
      }
    }
    return value;
  };
  if (nestJsonFields) {
    for (const nestJsonField of nestJsonFields) {
      // have a nest field, and nest field is json type, also value is defined
      if (nestJsonField.jsonInterface && value[nestJsonField.name]) {
        value[nestJsonField.name] = processGetJson(nestJsonField, value[nestJsonField.name]);
      }
    }
  }
  return processBigIntFields(value);
}

function processSetJson(data: any): any {
  return JSON.parse(
    JSON.stringify(data, (key, value) => {
      if (typeof value === 'bigint') {
        return `${value}n`;
      }
      return value;
    })
  );
}
