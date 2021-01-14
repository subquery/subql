// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { GraphQLObjectType, GraphQLOutputType, isNonNullType } from 'graphql';
import { ModelAttributes } from 'sequelize';
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
};

export function objectTypeToModelAttributes(
  objectType: GraphQLObjectType,
): ModelAttributes<any> {
  const fields = objectType.getFields();
  return Object.entries(fields).reduce((acc, [k, v]) => {
    let type: GraphQLOutputType = v.type;
    let allowNull = true;
    if (isNonNullType(type)) {
      type = type.ofType;
      allowNull = false;
    }
    const columnOption: ModelAttributeColumnOptions<any> = {
      type: SEQUELIZE_TYPE_MAPPING[type.toString()],
      allowNull,
      primaryKey: type.toString() === 'ID',
    };
    if (type.toString() === 'BigInt') {
      columnOption.get = function () {
        if (this.getDataValue(k)) {
          return BigInt(this.getDataValue(k));
        } else {
          return;
        }
      };
      columnOption.set = function (val: unknown) {
        this.setDataValue(k, val?.toString());
      };
    }
    acc[k] = columnOption;
    return acc;
  }, {} as ModelAttributes<any>);
}
