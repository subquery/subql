// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Injectable, Optional} from '@nestjs/common';
import {
  Sequelize,
  Transaction,
  ModelAttributes,
  ModelAttributeColumnOptions,
  Model,
  DataType,
  DataTypes,
} from '@subql/x-sequelize';
import {GraphQLSchema, ObjectTypeDefinitionNode, parse, printSchema, visit, DefinitionNode, TypeNode} from 'graphql';
import {getLogger} from '../logger';

interface FieldDetailsType {
  fieldName: string;
  type: string; // Int, String... etc
  attributes: ModelAttributeColumnOptions;
}
export interface EntityChanges {
  addedFields: FieldDetailsType[];
  removedFields: FieldDetailsType[];
}

export interface SchemaChanges {
  addedEntities: {entityName: string; attributes: ModelAttributes}[];
  removedEntities: string[];
  modifiedEntities: Record<string, EntityChanges>;
}

const logger = getLogger('SchemaMigrationService');

export function extractTypeDetails(typeNode: TypeNode): {dataType: string; graphQLType: string} {
  let currentTypeNode: TypeNode = typeNode;

  while (currentTypeNode.kind === 'NonNullType' || currentTypeNode.kind === 'ListType') {
    currentTypeNode = currentTypeNode.type;
  }

  const name = currentTypeNode.kind === 'NamedType' ? currentTypeNode.name.value : '';

  return {graphQLType: currentTypeNode.kind, dataType: name};
}

function mapGraphQLTypeToSequelize(type: string, knownEntities: Set<string>): DataType {
  if (knownEntities.has(type)) {
    return DataTypes.UUID;
  }

  const typeMapping: Record<string, DataType> = {
    Int: DataTypes.INTEGER,
    String: DataTypes.STRING,
    Boolean: DataTypes.BOOLEAN,
    ID: DataTypes.UUID,
    BigInt: DataTypes.BIGINT,
    // TODO .. add more supported types
    // TODO if the type is of an available Entity it should be considered as ID ?
  };

  return typeMapping[type] || DataTypes.STRING; // Default to STRING if type not found
}

@Injectable()
export class SchemaMigrationService {
  constructor(private sequelize: Sequelize) {}

  compareSchema(currentSchema: GraphQLSchema, nextSchema: GraphQLSchema): SchemaChanges {
    const currentSchemaString = printSchema(currentSchema);
    const nextSchemaString = printSchema(nextSchema);

    // Parse the schema strings into AST
    const currentSchemaAST = parse(currentSchemaString);
    const nextSchemaAST = parse(nextSchemaString);

    const changes: SchemaChanges = {
      addedEntities: [],
      removedEntities: [],
      modifiedEntities: {},
    };

    // Collect all entity names from both schemas
    const knownEntityNames = new Set<string>();

    const collectEntityNames = (node: ObjectTypeDefinitionNode) => {
      knownEntityNames.add(node.name.value);
    };

    // This must be looped prior to set knownEntityName
    visit(currentSchemaAST, {ObjectTypeDefinition: collectEntityNames});
    visit(nextSchemaAST, {ObjectTypeDefinition: collectEntityNames});

    visit(nextSchemaAST, {
      ObjectTypeDefinition(node) {
        const typeName = node.name.value;
        const oldTypeNode = currentSchemaAST.definitions.find(
          (def: any) => def.kind === 'ObjectTypeDefinition' && def.name.value === typeName
        ) as ObjectTypeDefinitionNode;

        if (oldTypeNode === undefined) {
          // Collect attributes for the new entity
          const attributes =
            node.fields?.reduce((acc, field) => {
              const fieldDetails = extractTypeDetails(field.type);
              acc[field.name.value] = {
                type: mapGraphQLTypeToSequelize(fieldDetails.dataType, knownEntityNames),
                allowNull: !field.type.kind.includes('NonNullType'),
                // Add other relevant Sequelize attributes here
              };
              return acc;
            }, {} as Record<string, any>) || {};

          changes.addedEntities.push({entityName: typeName, attributes});
        } else {
          const newFields = node.fields?.map((field) => field) || [];
          const oldFields = oldTypeNode.fields?.map((field) => field) || [];

          const addedFields: FieldDetailsType[] = newFields
            .filter((field) => !oldFields.some((oldField) => oldField.name.value === field.name.value))
            .map((field) => ({
              fieldName: field.name.value,
              type: extractTypeDetails(field.type).dataType,
              attributes: {
                type: mapGraphQLTypeToSequelize(extractTypeDetails(field.type).dataType, knownEntityNames),
                allowNull: !field.type.kind.includes('NonNullType'),
                // TODO JSON types... etc needs to be added here
              },
            }));
          const removedFields: FieldDetailsType[] = oldFields
            .filter((field) => !newFields.some((newField) => newField.name.value === field.name.value))
            .map((field) => ({
              fieldName: field.name.value,
              type: extractTypeDetails(field.type).dataType,
              attributes: {
                type: mapGraphQLTypeToSequelize(extractTypeDetails(field.type).dataType, knownEntityNames),
                allowNull: !field.type.kind.includes('NonNullType'),
                // TODO JSON types... etc needs to be added here
              },
            }));

          const modifiedFields: Record<string, {old: FieldDetailsType; new: FieldDetailsType}> = {};

          if (node.fields) {
            node.fields.forEach((newField) => {
              const oldField = oldFields.find((oldField) => oldField.name.value === newField.name.value);

              if (oldField) {
                const newFieldDetails = {
                  fieldName: newField.name.value,
                  type: extractTypeDetails(newField.type).dataType,
                  attributes: {
                    type: mapGraphQLTypeToSequelize(extractTypeDetails(newField.type).dataType, knownEntityNames),
                    allowNull: !newField.type.kind.includes('NonNullType'),
                    // TODO JSON types... etc needs to be added here
                  },
                };

                const oldFieldDetails = {
                  fieldName: oldField.name.value,
                  type: extractTypeDetails(oldField.type).dataType,
                  attributes: {
                    type: mapGraphQLTypeToSequelize(extractTypeDetails(oldField.type).dataType, knownEntityNames),
                    allowNull: !oldField.type.kind.includes('NonNullType'),
                    // TODO JSON types... etc needs to be added here
                  },
                };

                if (
                  newFieldDetails.type !== oldFieldDetails.type ||
                  newFieldDetails.attributes.allowNull !== oldFieldDetails.attributes.allowNull
                ) {
                  modifiedFields[newField.name.value] = {old: oldFieldDetails, new: newFieldDetails};
                }
              }
            });

            for (const fieldName in modifiedFields) {
              const {new: newDetails, old} = modifiedFields[fieldName];
              changes.modifiedEntities[typeName] = changes.modifiedEntities[typeName] || {
                addedFields: [],
                removedFields: [],
              };
              changes.modifiedEntities[typeName].addedFields.push(newDetails);
              changes.modifiedEntities[typeName].removedFields.push(old);
            }

            changes.modifiedEntities[typeName] = {
              addedFields: [...(changes.modifiedEntities[typeName]?.addedFields || []), ...addedFields],
              removedFields: [...(changes.modifiedEntities[typeName]?.removedFields || []), ...removedFields],
            };
          }
        }
      },
    });

    // Detecting types removed in the new schema
    visit(currentSchemaAST, {
      ObjectTypeDefinition(node) {
        const typeName = node.name.value;
        const typeExistsInNew = nextSchemaAST.definitions.some(
          (def: DefinitionNode) => def.kind === 'ObjectTypeDefinition' && def.name.value === typeName
        );

        if (!typeExistsInNew) {
          changes.removedEntities.push(typeName);
        }
      },
    });
    return changes;
  }
  // TODO: If modifying exisiting column, index check is necessary to find all existing Index, if there are indexes in place, then we must reintroduce it

  // TODO add relationToMap

  // TODO add id and blockRange Attributes
  async run(currentSchema: GraphQLSchema, nextSchema: GraphQLSchema): Promise<void> {
    const transaction = await this.sequelize.transaction();
    const {addedEntities, modifiedEntities, removedEntities} = this.compareSchema(currentSchema, nextSchema);

    try {
      // Remove should always occur before create
      if (removedEntities.length) {
        await Promise.all(removedEntities.map((entity) => this.dropTable(entity, transaction)));
      }

      if (addedEntities.length) {
        // TODO if the table has fields that is relational to another table that is yet to exist, that table should be created first
        await Promise.all(
          addedEntities.map((entity) => this.createTable(entity.entityName, entity.attributes, transaction))
        );
      }
      const dropColumnExecutables: Promise<void>[] = [];
      const createColumnExecutables: Promise<void>[] = [];

      if (Object.keys(modifiedEntities).length) {
        const entities = Object.keys(modifiedEntities);
        entities.forEach((entity) => {
          const entityValues = modifiedEntities[entity];

          entityValues.removedFields.forEach((field) => {
            dropColumnExecutables.push(this.dropColumn(entity, field.fieldName, transaction));
          });

          entityValues.addedFields.forEach((field) => {
            // TODO ensure that field.type is correct
            createColumnExecutables.push(this.createColumn(entity, field.fieldName, field.type, transaction));
          });
        });
      }

      await Promise.all(dropColumnExecutables);
      await Promise.all(createColumnExecutables);

      await transaction.commit();
    } catch (e: any) {
      await transaction.rollback();
      throw new Error(e);
    }
  }

  private async createColumn(
    tableName: string,
    columnName: string,
    dataType: ModelAttributeColumnOptions<Model<any, any>> | DataType,
    transaction: Transaction
  ): Promise<void> {
    await this.sequelize.getQueryInterface().addColumn(tableName, columnName, dataType, {transaction});
  }
  private async dropColumn(tableName: string, columnName: string, transaction: Transaction): Promise<void> {
    await this.sequelize.getQueryInterface().removeColumn(tableName, columnName, {transaction});
  }
  private async createTable(tableName: string, attributes: ModelAttributes, transaction: Transaction): Promise<void> {
    await this.sequelize.getQueryInterface().createTable(tableName, attributes, {transaction});
  }
  private async dropTable(tableName: string, transaction: Transaction): Promise<void> {
    await this.sequelize.getQueryInterface().dropTable(tableName, {transaction});
  }
  private async createIndex() {
    //
  }
  private async dropIndex() {
    //
  }
}
