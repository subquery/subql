// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Injectable} from '@nestjs/common';
import {
  Sequelize,
  ModelAttributes,
  ModelAttributeColumnOptions,
  DataType,
  DataTypes,
  StringDataType,
  Utils,
} from '@subql/x-sequelize';
import {GraphQLSchema, ObjectTypeDefinitionNode, parse, printSchema, visit, DefinitionNode, TypeNode} from 'graphql';
import {getLogger} from '../logger';
import {modelToTableName} from '../utils/sequelizeUtil';

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

// just a wrapper for naming confusion
function formatColumnName(columnName: string): string {
  return Utils.underscoredIf(columnName, true);
}

const sequelizeToPostgresTypeMap = {
  [DataTypes.STRING.name]: (dataType: DataType) => {
    const stringDataType = dataType as StringDataType;
    const length = stringDataType.options?.length;
    return length ? `VARCHAR(${length})` : 'TEXT';
  },
  [DataTypes.INTEGER.name]: () => 'INTEGER',
  [DataTypes.BIGINT.name]: () => 'BIGINT',
  [DataTypes.UUID.name]: () => 'UUID',
  [DataTypes.BOOLEAN.name]: () => 'BOOLEAN',
  [DataTypes.FLOAT.name]: () => 'FLOAT',
  [DataTypes.DATE.name]: () => 'TIMESTAMP',
};

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

function formatDataType(dataType: DataType): string {
  if (typeof dataType === 'string') {
    return dataType;
  } else {
    const formatter = sequelizeToPostgresTypeMap[dataType.key];
    return formatter(dataType);
  }
}

function formatAttributes(attributes: ModelAttributes): string {
  return Object.entries(attributes)
    .map(([colName, options]) => {
      const typedOptions = options as ModelAttributeColumnOptions;

      const type = formatDataType(typedOptions.type);
      const allowNull = typedOptions.allowNull === false ? 'NOT NULL' : '';
      const defaultValue = typedOptions.defaultValue ? `DEFAULT '${typedOptions.defaultValue}'` : '';
      const primaryKey = typedOptions.primaryKey ? 'PRIMARY KEY' : '';
      const unique = typedOptions.unique ? 'UNIQUE' : '';
      const autoIncrement = typedOptions.autoIncrement ? 'AUTO_INCREMENT' : '';

      // Construct the column definition string
      return `"${modelToTableName(
        colName
      )}" ${type} ${allowNull} ${defaultValue} ${primaryKey} ${unique} ${autoIncrement}`.trim();
    })
    .join(', ');
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
  async run(currentSchema: GraphQLSchema, nextSchema: GraphQLSchema, dbSchema: string): Promise<void> {
    const transaction = await this.sequelize.transaction();
    if (!transaction) {
      throw new Error('Failed to create transaction');
    }
    const {addedEntities, modifiedEntities, removedEntities} = this.compareSchema(currentSchema, nextSchema);

    // get all json
    // getAllJsonObjects

    // get enums
    // getAllEnums

    // get entity relations
    // getAllEntitiesRelations

    // Composite Indexes

    console.log('schemaMigration run executed');
    console.log('removed', removedEntities);
    console.log('added', addedEntities);
    const executableQueries: string[] = [];
    try {
      // Remove should always occur before create
      if (removedEntities.length) {
        removedEntities.forEach((entity) => {
          executableQueries.push(this.dropTable(dbSchema, entity));
        });
      }

      if (addedEntities.length) {
        // TODO if the table has fields that is relational to another table that is yet to exist, that table should be created first
        addedEntities.forEach((entity) => {
          executableQueries.push(this.createTable(dbSchema, entity.entityName, entity.attributes));
        });
      }

      if (Object.keys(modifiedEntities).length) {
        const entities = Object.keys(modifiedEntities);
        entities.forEach((entity) => {
          const entityValues = modifiedEntities[entity];

          entityValues.removedFields.forEach((field) => {
            executableQueries.push(this.dropColumn(dbSchema, entity, field.fieldName));
          });

          entityValues.addedFields.forEach((field) => {
            executableQueries.push(this.createColumn(dbSchema, entity, field.fieldName, field.type));
          });
        });
      }
      console.log('executableQueries', executableQueries);
      for (const query of executableQueries) {
        await this.sequelize.query(query, {transaction});
      }

      await transaction.commit();
    } catch (e: any) {
      console.log(e);
      await transaction.rollback();
      throw new Error(e);
    }
  }

  private createColumn(schema: string, tableName: string, columnName: string, dataType: DataType): string {
    return `
    DO $$ 
    BEGIN
      BEGIN
        ALTER TABLE "${schema}"."${modelToTableName(tableName)}" ADD COLUMN "${formatColumnName(
      columnName
    )}" ${dataType};
      EXCEPTION
        WHEN duplicate_column THEN RAISE NOTICE 'column ${formatColumnName(
          columnName
        )} already exists in ${modelToTableName(tableName)}.';
      END;
    END;
    $$;
  `;
    // return `ALTER TABLE "${schema}"."${modelToTableName(tableName)}" ADD COLUMN "${formatColumnName(columnName)}" ${dataType};`;
  }

  private dropColumn(schema: string, tableName: string, columnName: string): string {
    return `ALTER TABLE  "${schema}"."${modelToTableName(tableName)}" DROP COLUMN IF EXISTS ${formatColumnName(
      columnName
    )};`;
  }
  private createTable(schema: string, tableName: string, attributes: ModelAttributes): string {
    const formattedAttributes = formatAttributes(attributes);
    return `CREATE TABLE IF NOT EXISTS "${schema}"."${modelToTableName(tableName)}" (${formattedAttributes});`;
  }

  private dropTable(schema: string, tableName: string): string {
    return `DROP TABLE IF EXISTS "${schema}"."${modelToTableName(tableName)}";`;
  }

  private async createIndex() {
    //
  }
  private async dropIndex() {
    //
  }
}
