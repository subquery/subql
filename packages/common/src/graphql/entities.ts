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
  GraphQLSchema,
  isListType,
  isNonNullType,
  isObjectType,
} from 'graphql';
import {DirectiveName} from './constant';

import {
  FieldScalar,
  GraphQLEntityField,
  GraphQLModelsRelations,
  GraphQLModelsType,
  GraphQLRelationsType,
} from './types';

export function getAllEntitiesRelations(schema: GraphQLSchema): GraphQLModelsRelations {
  const entities = Object.values(schema.getTypeMap())
    .filter((node) => node.astNode?.directives?.find(({name: {value}}) => value === DirectiveName.Entity))
    .map((node) => node)
    .filter(isObjectType);

  const entityNameSet = entities.map(function (entity) {
    return entity.name;
  });

  const modelRelations = {models: [], relations: []} as GraphQLModelsRelations;
  const derivedFrom = schema.getDirective('derivedFrom');
  for (const entity of entities) {
    const newModel: GraphQLModelsType = {
      name: entity.name,
      fields: [],
    };
    for (const field of Object.values(entity.getFields())) {
      const typeString = extractType(field.type).toString();
      const directValues = getDirectiveValues(derivedFrom, field.astNode);
      //If is a basic scalar type
      if (Object.values(FieldScalar).includes(typeString)) {
        newModel.fields.push(packEntityField(typeString, field, false));
      }
      // If is a foreign key
      else if (entityNameSet.includes(typeString) && !directValues) {
        newModel.fields.push(packEntityField(typeString, field, true));
        modelRelations.relations.push({
          from: entity.name,
          type: 'belongsTo',
          to: typeString,
          foreignKey: `${field.name}Id`,
        } as GraphQLRelationsType);
      }
      // If is derivedFrom
      else if (entityNameSet.includes(typeString) && directValues) {
        modelRelations.relations.push({
          from: entity.name,
          type: isListType(isNonNullType(field.type) ? getNullableType(field.type) : field.type) ? 'hasMany' : 'hasOne',
          to: typeString,
          foreignKey: `${directValues.field}Id`,
          fieldName: field.name,
        } as GraphQLRelationsType);
      } else {
        throw new Error(`${typeString} is not an valid type`);
      }
    }
    modelRelations.models.push(newModel);
  }
  validateRelations(modelRelations);
  return modelRelations;
}

function packEntityField(
  typeString: FieldScalar,
  field: GraphQLField<any, any>,
  isForeignKey: Boolean
): GraphQLEntityField {
  return {
    name: isForeignKey ? `${field.name}Id` : field.name,
    type: isForeignKey ? 'String' : typeString,
    isArray: isListType(isNonNullType(field.type) ? getNullableType(field.type) : field.type),
    nullable: !isNonNullType(field.type),
  };
}
//Get the type, ready to be convert to string
function extractType(type: GraphQLOutputType) {
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
