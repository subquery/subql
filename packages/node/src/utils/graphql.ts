// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

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
  Bytes: 'bytea',
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
    acc[field.name] = columnOption;
    return acc;
  }, {} as ModelAttributes<any>);
}

export function isBasicType(t: string): boolean {
  return Object.keys(SEQUELIZE_TYPE_MAPPING).findIndex((k) => k === t) >= 0;
}
