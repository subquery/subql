// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import path from 'path';
import {SchemaMigrationService} from '@subql/node-core';
import {buildSchemaFromFile} from '@subql/utils';

describe('SchemaMigration', () => {
  describe('comparator', () => {
    const oldSchemaPath = path.join(__dirname, '../../test/schemas/oldSchema.graphql');
    const newSchemaPath = path.join(__dirname, '../../test/schemas/newSchema.graphql');
    const badSchemaPath = path.join(__dirname, '../../test/schemas/badSchema.graphql');

    const schemaMigrationService = new SchemaMigrationService({} as any);

    it('ensure comparator correctness', () => {
      const currentSchema = buildSchemaFromFile(oldSchemaPath);
      const nextSchema = buildSchemaFromFile(newSchemaPath);
      const result = schemaMigrationService.schemaComparator(currentSchema, nextSchema);
      /*
      Cases:
        Added
        - Added Unique Index
        - Added field with relation
        - Added New Enum
        - Added belongsTo relation
        - Added hasMany relation
        - Added new JsonField (with nested json)
        Removed
        - Drop field on entity
        - Drop field with Relation
        - Drop Entity with JsonField
        - Drop Enum
        Modified
        - Entity - field
        - Modify Enum // TODO this is currently not being handled
       */
      const expectResult = require('../../test/schemas/schemaDiff.json');
      expect(JSON.parse(JSON.stringify(result))).toStrictEqual(expectResult);
    });
    it('comparator should throw on nullable to non-nullable', () => {
      const currentSchema = buildSchemaFromFile(oldSchemaPath);
      const nextSchema = buildSchemaFromFile(badSchemaPath);
      expect(() => schemaMigrationService.schemaComparator(currentSchema, nextSchema)).toThrow(
        'n Entity: EntityOne, field: field2 changed from non-nullable to nullable.'
      );
    });
  });
});
