// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
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
import {GraphQLSchema, ObjectTypeDefinitionNode, parse, visit} from 'graphql';

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

// should log out the differences in accordance
export function compareSchema(oldSchema: GraphQLSchema, newSchema: GraphQLSchema): any {
  const oldSchemaAST = oldSchema;
  const newSchemaAST = newSchema;

  const changes = {
    addedTypes: [] as any[],
    removedTypes: [] as any[],
    modifiedTypes: {} as any,
    // ... more specific changes if needed
  };

  // visit(newSchemaAST, {
  //   ObjectTypeDefinition(node) {
  //     const typeName = node.name.value;
  //     const oldTypeNode = oldSchemaAST.definitions.find(
  //         (def: any) => def.kind === 'ObjectTypeDefinition' && def.name.value === typeName
  //     ) as ObjectTypeDefinitionNode
  //
  //     if (oldTypeNode === undefined) {
  //       changes.addedTypes.push(typeName);
  //     } else {
  //       const newFields = node.fields?.map(field => field.name.value) || [];
  //       const oldFields = oldTypeNode.fields?.map(field => field.name.value) || [];
  //
  //       const addedFields = newFields.filter(field => !oldFields.includes(field));
  //       const removedFields = oldFields.filter(field => !newFields.includes(field));
  //
  //       if (addedFields.length || removedFields.length) {
  //         changes.modifiedTypes[typeName] = { addedFields, removedFields };
  //       }
  //     }
  //   }
  // });
  //
  // // Detecting types removed in the new schema
  // visit(oldSchemaAST, {
  //   ObjectTypeDefinition(node) {
  //     const typeName = node.name.value;
  //     const typeExistsInNew = newSchemaAST.definitions.some(
  //         (def: any) => def.kind === 'ObjectTypeDefinition' && def.name.value === typeName
  //     );
  //
  //     if (!typeExistsInNew) {
  //       changes.removedTypes.push(typeName);
  //     }
  //   }
  // });
}
