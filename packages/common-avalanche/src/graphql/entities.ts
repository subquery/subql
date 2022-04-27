// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import {getTypeByScalarName} from '@subql/common-avalanche';
import {
  assertListType,
  getDirectiveValues,
  getNullableType,
  GraphQLEnumType,
  GraphQLField,
  GraphQLNamedType,
  GraphQLObjectType,
  GraphQLOutputType,
  GraphQLSchema,
  isEnumType,
  isInterfaceType,
  isListType,
  isNonNullType,
  isObjectType,
  isUnionType,
} from 'graphql';
import {DirectiveName} from './constant';
import {buildSchemaFromFile} from './schema';
import {
  FieldScalar,
  GraphQLEntityField,
  GraphQLJsonFieldType,
  GraphQLJsonObjectType,
  GraphQLModelsRelationsEnums,
  GraphQLModelsType,
  GraphQLRelationsType,
  IndexType,
} from './types';

export function getAllJsonObjects(_schema: GraphQLSchema | string): GraphQLObjectType[] {
  return Object.values(getSchema(_schema).getTypeMap())
    .filter((node) => node.astNode?.directives?.find(({name: {value}}) => value === DirectiveName.JsonField))
    .map((node) => node)
    .filter(isObjectType);
}

export function getAllEnums(_schema: GraphQLSchema | string): GraphQLEnumType[] {
  return getEnumsFromSchema(getSchema(_schema));
}

// eslint-disable-next-line complexity
export function getAllEntitiesRelations(_schema: GraphQLSchema | string): GraphQLModelsRelationsEnums {
  const schema = getSchema(_schema);
  const entities = Object.values(schema.getTypeMap())
    .filter((node) => node.astNode?.directives?.find(({name: {value}}) => value === DirectiveName.Entity))
    .filter(isObjectType);

  const jsonObjects = getAllJsonObjects(schema);

  const entityNameSet = entities.map((entity) => entity.name);

  const enums = new Map(
    getEnumsFromSchema(schema).map((node) => [
      node.name,
      {name: node.name, description: node.description, values: node.getValues().map((v) => v.value)},
    ])
  );

  const modelRelations = {models: [], relations: [], enums: [...enums.values()]} as GraphQLModelsRelationsEnums;
  const derivedFrom = schema.getDirective('derivedFrom');
  const indexDirective = schema.getDirective('index');
  for (const entity of entities) {
    const newModel: GraphQLModelsType = {
      name: entity.name,
      description: entity.description,
      fields: [],
      indexes: [],
    };

    for (const field of Object.values(entity.getFields())) {
      const typeString = extractType(field.type);
      const derivedFromDirectValues = getDirectiveValues(derivedFrom, field.astNode);
      const indexDirectiveVal = getDirectiveValues(indexDirective, field.astNode);
      //If is a basic scalar type
      const typeClass = getTypeByScalarName(typeString);
      if (typeClass?.fieldScalar) {
        newModel.fields.push(packEntityField(typeString, field, false));
      }
      // If is an enum
      else if (enums.has(typeString)) {
        newModel.fields.push({
          type: typeString,
          description: field.description,
          isEnum: true,
          isArray: isListType(isNonNullType(field.type) ? getNullableType(field.type) : field.type),
          nullable: !isNonNullType(field.type),
          name: field.name,
        });
      }
      // If is a foreign key
      else if (entityNameSet.includes(typeString) && !derivedFromDirectValues) {
        newModel.fields.push(packEntityField(typeString, field, true));
        modelRelations.relations.push({
          from: entity.name,
          type: 'belongsTo',
          to: typeString,
          foreignKey: `${field.name}Id`,
        } as GraphQLRelationsType);
        newModel.indexes.push({
          unique: false,
          fields: [`${field.name}Id`],
          using: IndexType.HASH,
        });
      }
      // If is derivedFrom
      else if (entityNameSet.includes(typeString) && derivedFromDirectValues) {
        modelRelations.relations.push({
          from: entity.name,
          type: isListType(isNonNullType(field.type) ? getNullableType(field.type) : field.type) ? 'hasMany' : 'hasOne',
          to: typeString,
          foreignKey: `${derivedFromDirectValues.field}Id`,
          fieldName: field.name,
        } as GraphQLRelationsType);
      }
      // If is jsonField
      else if (jsonObjects.map((json) => json.name).includes(typeString)) {
        const jsonObject = setJsonObjectType(
          jsonObjects.find((object) => object.name === typeString),
          jsonObjects
        );
        newModel.fields.push(packJSONField(typeString, field, jsonObject));
        newModel.indexes.push({
          unique: false,
          fields: [field.name],
          using: IndexType.GIN,
        });
      } else {
        throw new Error(`${typeString} is not an valid type`);
      }
      // handle indexes
      if (indexDirectiveVal) {
        if (typeString !== 'ID' && typeClass) {
          newModel.indexes.push({
            unique: indexDirectiveVal.unique,
            fields: [field.name],
          });
        } else if (typeString !== 'ID' && entityNameSet.includes(typeString)) {
          if (indexDirectiveVal.unique) {
            const fkIndex = newModel.indexes.find(
              (idx) => idx.fields.length === 1 && idx.fields[0] === `${field.name}Id`
            );
            if (fkIndex) {
              fkIndex.unique = true;
            }
          }
        } else {
          throw new Error(`index can not be added on field ${field.name}`);
        }
      }
    }
    modelRelations.models.push(newModel);
  }
  validateRelations(modelRelations);
  return modelRelations;
}

function packEntityField(
  typeString: FieldScalar | string,
  field: GraphQLField<unknown, unknown>,
  isForeignKey: boolean
): GraphQLEntityField {
  return {
    name: isForeignKey ? `${field.name}Id` : field.name,
    type: isForeignKey ? FieldScalar.String : typeString,
    description: field.description,
    isArray: isListType(isNonNullType(field.type) ? getNullableType(field.type) : field.type),
    nullable: !isNonNullType(field.type),
    isEnum: false,
  };
}

function packJSONField(
  typeString: string,
  field: GraphQLField<unknown, unknown>,
  jsonObject: GraphQLJsonObjectType
): GraphQLEntityField {
  return {
    name: field.name,
    type: 'Json',
    description: field.description,
    jsonInterface: jsonObject,
    isArray: isListType(isNonNullType(field.type) ? getNullableType(field.type) : field.type),
    nullable: !isNonNullType(field.type),
    isEnum: false,
  };
}

export function setJsonObjectType(
  jsonObject: GraphQLObjectType<unknown, unknown>,
  jsonObjects: GraphQLObjectType<unknown, unknown>[]
): GraphQLJsonObjectType {
  const graphQLJsonObject: GraphQLJsonObjectType = {
    name: jsonObject.name,
    fields: [],
  };
  for (const field of Object.values(jsonObject.getFields())) {
    //check if field is also json
    const typeString = extractType(field.type);
    const isJsonType = jsonObjects.map((json) => json.name).includes(typeString);
    graphQLJsonObject.fields.push({
      name: field.name,
      type: isJsonType ? 'Json' : extractType(field.type),
      jsonInterface: isJsonType
        ? setJsonObjectType(
            jsonObjects.find((object) => object.name === typeString),
            jsonObjects
          )
        : undefined,
      nullable: !isNonNullType(field.type),
      isArray: isListType(isNonNullType(field.type) ? getNullableType(field.type) : field.type),
    } as GraphQLJsonFieldType);
  }
  return graphQLJsonObject;
}

function getSchema(_schema: GraphQLSchema | string): GraphQLSchema {
  return typeof _schema === 'string' ? buildSchemaFromFile(_schema) : _schema;
}

function getEnumsFromSchema(schema: GraphQLSchema): GraphQLEnumType[] {
  return Object.values(schema.getTypeMap())
    .filter((r) => r.astNode !== undefined)
    .filter(isEnumType);
}

//Get the type, ready to be convert to string
function extractType(type: GraphQLOutputType): string {
  if (isUnionType(type)) {
    throw new Error(`Not support Union type`);
  }
  if (isInterfaceType(type)) {
    throw new Error(`Not support Interface type`);
  }
  const offNullType = isNonNullType(type) ? getNullableType(type) : type;
  const offListType = isListType(offNullType) ? assertListType(offNullType).ofType : type;
  return isNonNullType(offListType)
    ? (getNullableType(offListType) as unknown as GraphQLNamedType).name
    : offListType.name;
}

function validateRelations(modelRelations: GraphQLModelsRelationsEnums): void {
  for (const r of modelRelations.relations.filter((model) => model.type === 'hasMany' || model.type === 'hasOne')) {
    assert(
      modelRelations.models.find(
        (model) => model.name === r.to && model.fields.find((field) => field.name === r.foreignKey)
      ),
      `Please check entity ${r.from} with field ${r.fieldName} has correct relation with entity ${r.to}`
    );
  }
}
