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
import {GraphQLSchema, ObjectTypeDefinitionNode, parse, visit, introspectionFromSchema, printSchema} from 'graphql';

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
export function compareSchema(currentSchema: GraphQLSchema, nextSchema: GraphQLSchema): any {
  const currentSchemaString = printSchema(currentSchema);
  const nextSchemaString = printSchema(nextSchema);

  // Parse the schema strings into AST
  const currentSchemaAST = parse(currentSchemaString);
  const nextSchemaAST = parse(nextSchemaString);

  const changes = {
    addedTypes: [] as any[],
    removedTypes: [] as any[],
    modifiedTypes: {} as any,
  };

  visit(nextSchemaAST, {
    ObjectTypeDefinition(node) {
      const typeName = node.name.value;
      const oldTypeNode = currentSchemaAST.definitions.find(
        (def: any) => def.kind === 'ObjectTypeDefinition' && def.name.value === typeName
      ) as ObjectTypeDefinitionNode;

      if (oldTypeNode === undefined) {
        changes.addedTypes.push(typeName);
      } else {
        const newFields = node.fields?.map((field) => field) || [];
        const oldFields = oldTypeNode.fields?.map((field) => field) || [];

        const addedFields = newFields.filter(
          (field) => !oldFields.some((oldField) => oldField.name.value === field.name.value)
        );
        const removedFields = oldFields.filter(
          (field) => !newFields.some((newField) => newField.name.value === field.name.value)
        );
        // check for modified fields
        const modifiedFields = newFields.reduce((acc, newField) => {
          const oldField = oldFields.find((oldField) => oldField.name.value === newField.name.value);
          if (oldField && oldField.type.kind !== newField.type.kind) {
            acc[newField.name.value] = {from: oldField.type.kind, to: newField.type.kind};
          }
          return acc;
        }, {} as any);

        if (addedFields.length || removedFields.length || Object.keys(modifiedFields).length > 0) {
          changes.modifiedTypes[typeName] = {
            addedFields: addedFields.map((f) => f.name),
            removedFields: removedFields.map((f) => f.name),
            modifiedFields,
          };
        }
      }
    },
  });

  console.log('changes before remove detection', changes);
  // Detecting types removed in the new schema
  visit(currentSchemaAST, {
    ObjectTypeDefinition(node) {
      const typeName = node.name.value;
      const typeExistsInNew = nextSchemaAST.definitions.some(
        (def: any) => def.kind === 'ObjectTypeDefinition' && def.name.value === typeName
      );

      if (!typeExistsInNew) {
        changes.removedTypes.push(typeName);
      }
    },
  });
  console.log('changes', changes);
}
