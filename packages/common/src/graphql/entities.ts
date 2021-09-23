// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import {
  assertListType,
  getDirectiveValues,
  getNullableType,
  GraphQLField,
  GraphQLObjectType,
  GraphQLOutputType,
  GraphQLScalarType,
  GraphQLSchema,
  isEnumType,
  isInterfaceType,
  isListType,
  isNonNullType,
  isObjectType,
  isUnionType,
} from 'graphql';
import {DirectiveName} from './constant';
import {buildSchema} from './schema';
import {
  FieldScalar,
  GraphQLEntityField,
  GraphQLJsonFieldType,
  GraphQLJsonObjectType,
  GraphQLModelsRelations,
  GraphQLModelsType,
  GraphQLRelationsType,
  IndexType,
} from './types';
import {isFieldScalar} from './utils';

export function getAllJsonObjects(_schema: GraphQLSchema | string) {
  const schema = typeof _schema === 'string' ? buildSchema(_schema) : _schema;
  return Object.values(schema.getTypeMap())
    .filter((node) => node.astNode?.directives?.find(({name: {value}}) => value === DirectiveName.JsonField))
    .map((node) => node)
    .filter(isObjectType);
}

export function getAllEntitiesRelations(_schema: GraphQLSchema | string): GraphQLModelsRelations {
  const schema = typeof _schema === 'string' ? buildSchema(_schema) : _schema;
  const entities = Object.values(schema.getTypeMap())
    .filter((node) => node.astNode?.directives?.find(({name: {value}}) => value === DirectiveName.Entity))
    .map((node) => node)
    .filter(isObjectType);

  const jsonObjects = getAllJsonObjects(schema);

  const entityNameSet = entities.map((entity) => entity.name);

  const modelRelations = {models: [], relations: []} as GraphQLModelsRelations;
  const derivedFrom = schema.getDirective('derivedFrom');
  const indexDirective = schema.getDirective('index');
  for (const entity of entities) {
    const newModel: GraphQLModelsType = {
      name: entity.name,
      fields: [],
      indexes: [],
    };

    for (const field of Object.values(entity.getFields())) {
      const typeString = extractType(field.type).name;
      const derivedFromDirectValues = getDirectiveValues(derivedFrom, field.astNode);
      const indexDirectiveVal = getDirectiveValues(indexDirective, field.astNode);
      //If is a basic scalar type
      if (isFieldScalar(typeString)) {
        newModel.fields.push(packEntityField(typeString, field, false));
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
        if (typeString !== 'ID' && isFieldScalar(typeString)) {
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
  field: GraphQLField<any, any>,
  isForeignKey: boolean
): GraphQLEntityField {
  return {
    name: isForeignKey ? `${field.name}Id` : field.name,
    type: isForeignKey ? FieldScalar.String : typeString,
    isArray: isListType(isNonNullType(field.type) ? getNullableType(field.type) : field.type),
    nullable: !isNonNullType(field.type),
  };
}

function packJSONField(
  typeString: string,
  field: GraphQLField<any, any>,
  jsonObject: GraphQLJsonObjectType
): GraphQLEntityField {
  return {
    name: field.name,
    type: 'Json',
    jsonInterface: jsonObject,
    isArray: isListType(isNonNullType(field.type) ? getNullableType(field.type) : field.type),
    nullable: !isNonNullType(field.type),
  };
}

export function setJsonObjectType(
  jsonObject: GraphQLObjectType<any, any>,
  jsonObjects: GraphQLObjectType<any, any>[]
): GraphQLJsonObjectType {
  const graphQLJsonObject: GraphQLJsonObjectType = {
    name: jsonObject.name,
    fields: [],
  };
  for (const field of Object.values(jsonObject.getFields())) {
    //check if field is also json
    const typeString = extractType(field.type).name;
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

type GraphQLNonListType = GraphQLScalarType | GraphQLObjectType<any, any>; // check | GraphQLInterfaceType | GraphQLUnionType | GraphQLEnumType;
//Get the type, ready to be convert to string
function extractType(type: GraphQLOutputType): GraphQLNonListType {
  if (isUnionType(type)) {
    throw new Error(`Not support Union type`);
  }
  if (isInterfaceType(type)) {
    throw new Error(`Not support Interface type`);
  }
  if (isEnumType(type)) {
    throw new Error(`Not support Enum type`);
  }
  const offNullType = isNonNullType(type) ? getNullableType(type) : type;
  const offListType = isListType(offNullType) ? assertListType(offNullType).ofType : type;
  return isNonNullType(offListType) ? getNullableType(offListType) : offListType;
}

function validateRelations(modelRelations: GraphQLModelsRelations): void {
  for (const r of modelRelations.relations.filter((model) => model.type === 'hasMany' || model.type === 'hasOne')) {
    assert(
      modelRelations.models.find(
        (model) => model.name === r.to && model.fields.find((field) => field.name === r.foreignKey)
      ),
      `Please check entity ${r.from} with field ${r.fieldName} has correct relation with entity ${r.to}`
    );
  }
}
