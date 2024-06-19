// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
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
  ValueNode,
  BooleanValueNode,
  ListTypeNode,
  TypeNode,
} from 'graphql';
import {findDuplicateStringArray} from '../array';
import {Logger} from '../logger';
import {TypeNames, getTypeByScalarName} from '../types';
import {DirectiveName} from './constant';
import {buildSchemaFromFile} from './schema';
import {
  FieldScalar,
  GraphQLEntityField,
  GraphQLFullTextType,
  GraphQLJsonFieldType,
  GraphQLJsonObjectType,
  GraphQLModelsRelationsEnums,
  GraphQLModelsType,
  GraphQLRelationsType,
  IndexType,
} from './types';

const logger = new Logger({level: 'info', outputFormat: 'colored'}).getLogger('Utils.entities');

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
export function getAllEntitiesRelations(_schema: GraphQLSchema | string | null): GraphQLModelsRelationsEnums {
  if (_schema === null) {
    return {
      models: [],
      relations: [],
      enums: [],
    };
  }

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
  assert(derivedFrom && indexDirective, 'derivedFrom and index directives are required');
  for (const entity of entities) {
    const newModel: GraphQLModelsType = {
      name: entity.name,
      description: entity.description ?? undefined,
      fields: [],
      indexes: [],
    };
    const entityFields = Object.values(entity.getFields());

    const idField = entityFields.find((field) => field.name === 'id');
    if (!idField) {
      throw new Error(`Entity "${entity.name}" is missing required id field.`);
    } else if (idField.type.toString() !== 'ID!') {
      throw new Error(`Entity "${entity.name}" type must be ID, received ${idField.type.toString()}`);
    }

    const fkNameSet: string[] = [];
    for (const field of entityFields) {
      const typeString = extractType(field.type);
      const derivedFromDirectValues = field.astNode ? getDirectiveValues(derivedFrom, field.astNode) : undefined;
      const indexDirectiveVal = field.astNode ? getDirectiveValues(indexDirective, field.astNode) : undefined;

      //If is a basic scalar type
      const typeClass = getTypeByScalarName(typeString);
      if (typeClass?.fieldScalar) {
        newModel.fields.push(packEntityField(typeString, field, false));
      }
      // If is an enum
      else if (enums.has(typeString)) {
        newModel.fields.push({
          type: typeString,
          description: field.description ?? undefined,
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

        // Ensures that foreign keys are linked correctly
        if (
          field.astNode &&
          (field.astNode.type.kind === 'ListType' ||
            (field.astNode.type.kind === 'NonNullType' && field.astNode.type.type.kind === 'ListType'))
        ) {
          const resolveName = (type: TypeNode): string => {
            switch (type.kind) {
              case 'NamedType':
                return type.name.value;
              case 'NonNullType':
                return resolveName(type.type);
              case 'ListType':
                return resolveName(type.type);
              default:
                // Any case in case future adds new kind
                throw new Error(`Unandled node kind: ${(type as any).kind}`);
            }
          };

          throw new Error(
            `Field "${field.name}" on entity "${newModel.name}" is missing "derivedFrom" directive. Please also make sure "${resolveName(field.astNode.type)}" has a field of type "${newModel.name}".`
          );
        }

        newModel.indexes.push({
          unique: false,
          fields: [`${field.name}Id`],
          using: IndexType.HASH,
        });
        fkNameSet.push(field.name);
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
        const jsonObject = jsonObjects.find((object) => object.name === typeString);
        assert(jsonObject, `Json object ${typeString} not found`);
        const jsonObjectType = setJsonObjectType(jsonObject, jsonObjects);
        newModel.fields.push(packJSONField(typeString, field, jsonObjectType));

        const directive = jsonObject.astNode?.directives?.find(({name: {value}}) => value === DirectiveName.JsonField);
        const argValue = directive?.arguments?.find((arg) => arg.name.value === 'indexed')?.value;
        // For backwards compatibility if the argument is not defined then the index will be added
        if (!argValue || (isBooleanValueNode(argValue) && argValue.value !== false)) {
          newModel.indexes.push({
            unique: false,
            fields: [field.name],
            using: IndexType.GIN,
          });
        }
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

    // Composite Indexes
    const compositeIndexDirective = schema.getDirective('compositeIndexes');
    assert(compositeIndexDirective, 'compositeIndexes directive is required');
    assert(entity.astNode, 'Entity astNode is required');
    const compositeIndexDirectiveVal = getDirectiveValues(compositeIndexDirective, entity.astNode) as {
      fields?: string[][];
    };
    if (compositeIndexDirectiveVal?.fields && compositeIndexDirectiveVal?.fields.length) {
      const duplicateIndexes = findDuplicateStringArray(compositeIndexDirectiveVal.fields);
      if (duplicateIndexes.length) {
        throw new Error(
          `Found duplicate composite indexes ${JSON.stringify(duplicateIndexes)} on entity ${entity.name}`
        );
      }
      compositeIndexDirectiveVal.fields.forEach((indexFields) => {
        const joinFields = getJoinIndexFields(entity, entityFields, fkNameSet, indexFields);
        newModel.indexes.push({
          fields: joinFields,
        });
      });
    }

    // Fulltext Search
    const fullTextDirective = schema.getDirective('fullText');
    assert(fullTextDirective, 'fullText directive is required');
    const fullTextDirectiveVal = getDirectiveValues(fullTextDirective, entity.astNode) as GraphQLFullTextType;

    if (fullTextDirectiveVal) {
      if (!fullTextDirectiveVal.fields.length) {
        throw new Error(`Expected fullText directive to have at least one field on entity ${entity.name}`);
      }

      // Make fields unique
      fullTextDirectiveVal.fields = [...new Set(fullTextDirectiveVal.fields)];

      fullTextDirectiveVal.fields.forEach((searchField, index) => {
        const field = newModel.fields.find((f) => [searchField, `${searchField}Id`].includes(f.name));
        if (!field) {
          throw new Error(`Field "${searchField}" in fullText directive doesn't exist on entity "${entity.name}"`);
        }

        if (!['String', 'ID'].includes(field.type)) {
          throw new Error(`fullText directive fields only supports String types`);
        }

        // If the field is a realation, we rename the field to include _id
        if (field.name === `${searchField}Id`) {
          fullTextDirectiveVal.fields[index] = `${searchField}_id`;
        }
      });

      newModel.fullText = fullTextDirectiveVal;
    }

    modelRelations.models.push(newModel);
  }
  validateRelations(modelRelations);
  return modelRelations;
}

function getJoinIndexFields(
  entity: GraphQLObjectType<any, any>,
  entityFields: GraphQLField<any, any, {[p: string]: any}>[],
  fkNameSet: string[],
  IndexArgFields: string[]
): string[] {
  if (IndexArgFields.length === 1) {
    logger.warn(`Composite index expected to be more than 1 field , entity ${entity} [${IndexArgFields}]`);
  }
  if (IndexArgFields.length > 3) {
    throw new Error(
      `Composite index on entity ${entity} expected not more than 3 fields, index [${IndexArgFields}] got ${IndexArgFields.length} fields`
    );
  }
  // check duplicate fields
  const duplicateFields = IndexArgFields.filter((name, index, arr) => arr.indexOf(name) !== index);
  if (duplicateFields.length) {
    throw new Error(`Composite index ${entity}.${IndexArgFields} got duplicated fields: ${duplicateFields}`);
  }
  return IndexArgFields.map((j) => {
    const fieldInEntity = entityFields.find((f) => f.name === j);
    // check whether these fields are exist in the entity
    if (fieldInEntity === undefined) {
      throw new Error(`Composite index [${IndexArgFields}], field ${j} not found within entity ${entity} `);
    }
    // check is fk
    if (fkNameSet.includes(fieldInEntity.name)) {
      return `${j}Id`;
    }
    return j;
  });
}

function packEntityField(
  typeString: FieldScalar | string,
  field: GraphQLField<unknown, unknown>,
  isForeignKey: boolean
): GraphQLEntityField {
  return {
    name: isForeignKey ? `${field.name}Id` : field.name,
    type: isForeignKey ? FieldScalar.String : typeString,
    description: field.description ?? undefined,
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
    description: field.description ?? undefined,
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
    const jsonType = jsonObjects.find((json) => json.name === typeString);

    graphQLJsonObject.fields.push({
      name: field.name,
      type: jsonType ? 'Json' : extractType(field.type),
      jsonInterface: jsonType ? setJsonObjectType(jsonType, jsonObjects) : undefined,
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

function isBooleanValueNode(valueNode?: ValueNode): valueNode is BooleanValueNode {
  return valueNode?.kind === 'BooleanValue';
}
