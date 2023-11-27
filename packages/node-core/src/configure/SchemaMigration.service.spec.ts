// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import path from 'path';
import {SchemaChanges, SchemaMigrationService} from '@subql/node-core';
import {buildSchemaFromFile} from '@subql/utils';

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
                nullable: false,
                type: 'EntityTwo',
              },
            ],
            removedFields: [
              {
                fieldName: 'field3',
                nullable: true,
                type: 'BigInt',
              },
            ],
          },
          EntityTwo: {
            addedFields: [
              {
                fieldName: 'field2',
                type: 'String',
                nullable: false,
              },
              {
                fieldName: 'field3',
                type: 'Int',
                nullable: true,
              },
              {
                fieldName: 'field4',
                type: 'EntityFour',
                nullable: false,
              },
            ],
            removedFields: [
              {
                fieldName: 'field2',
                type: 'String',
                nullable: true,
              },
              {
                fieldName: 'field3',
                type: 'BigInt',
                nullable: true,
              },
              {
                fieldName: 'field1',
                type: 'Int',
                nullable: false,
              },
            ],
          },
        },
      };
      expect(v).toStrictEqual(expectOutput);
    });
  });
});
