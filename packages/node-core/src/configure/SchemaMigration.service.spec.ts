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
      const migrationService = new SchemaMigrationService(currentSchema, nextSchema);

      const v = migrationService.compareSchema();
      const expectdOutput: SchemaChanges = {
        addedEntities: ['EntityFour'],
        removedEntities: ['EntityThree'],
        modifiedEntities: {
          EntityOne: {
            addedFields: [],
            removedFields: [],
            modifiedFields: {
              field3: {
                type: {from: 'NameType', to: 'NonNullType'},
                kind: {from: 'NameType', to: 'NonNullType'},
              },
            },
          },
          EntityTwo: {
            addedFields: [{kind: 'Name', value: 'field4', loc: {start: 459, end: 465} as any}],
            removedFields: [{kind: 'Name', value: 'field1', loc: {start: 423, end: 429} as any}],
            modifiedFields: {
              field2: {
                type: {from: 'NameType', to: 'NonNullType'},
                kind: {from: 'NameType', to: 'NonNullType'},
              },
              // field3: {from: "NamedType", to: "NonNullType"}, # Unable to pick up BigInt to Int
            },
          },
        },
      };
      // expect(v).toStrictEqual()
    });
  });
});
