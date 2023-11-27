// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import path from 'path';
import {SchemaChanges, SchemaMigrationService} from '@subql/node-core';
import {buildSchemaFromFile} from '@subql/utils';
import {DataTypes} from '@subql/x-sequelize';

describe('SchemaMigration', () => {
  describe('comparator', () => {
    const oldSchemaPath = path.join(__dirname, '../../test/schemas/oldSchema.graphql');
    const newSchemaPath = path.join(__dirname, '../../test/schemas/newSchema.graphql');

    // add new entity
    // remove entity
    // modify entity fields
    it('drop, create, modify entity', () => {
      const currentSchema = buildSchemaFromFile(oldSchemaPath);
      const nextSchema = buildSchemaFromFile(newSchemaPath);

      const v = SchemaMigrationService.compareSchema(currentSchema, nextSchema);
      const expectOutput: SchemaChanges = {
        addedEntities: ['EntityFour'],
        removedEntities: ['EntityThree'],
        modifiedEntities: {
          EntityOne: {
            addedFields: [
              {
                fieldName: 'field3',
                type: 'EntityTwo',
                attributes: {
                  type: DataTypes.STRING,
                  allowNull: false,
                },
              },
            ],
            removedFields: [
              {
                fieldName: 'field3',
                type: 'BigInt',
                attributes: {
                  type: DataTypes.BIGINT,
                  allowNull: true,
                },
              },
            ],
          },
          EntityTwo: {
            addedFields: [
              {
                fieldName: 'field2',
                type: 'String',
                attributes: {
                  type: DataTypes.STRING,
                  allowNull: false,
                },
              },
              {
                fieldName: 'field3',
                type: 'Int',
                attributes: {
                  type: DataTypes.INTEGER,
                  allowNull: true,
                },
              },
              {
                fieldName: 'field4',
                type: 'EntityFour',
                attributes: {
                  type: DataTypes.STRING, // TODO this should be primary key
                  allowNull: false,
                },
              },
            ],
            removedFields: [
              {
                fieldName: 'field2',
                type: 'String',
                attributes: {
                  type: DataTypes.STRING,
                  allowNull: true,
                },
              },
              {
                fieldName: 'field3',
                type: 'BigInt',
                attributes: {
                  type: DataTypes.BIGINT,
                  allowNull: true,
                },
              },
              {
                fieldName: 'field1',
                type: 'Int',
                attributes: {
                  type: DataTypes.INTEGER,
                  allowNull: false,
                },
              },
            ],
          },
        },
      };
      expect(v).toStrictEqual(expectOutput);
    });
  });
});
