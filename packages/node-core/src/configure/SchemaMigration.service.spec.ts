// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import path from 'path';
import {compareEnums} from '@subql/node-core/configure/migration-service/migration-helpers';
import {buildSchemaFromFile, GraphQLEnumsType} from '@subql/utils';
import {SchemaMigrationService} from './migration-service';
import {ProjectUpgradeSevice} from './ProjectUpgrade.service';

describe('SchemaMigration', () => {
  describe('comparator', () => {
    const oldSchemaPath = path.join(__dirname, '../../test/schemas/oldSchema.graphql');
    const newSchemaPath = path.join(__dirname, '../../test/schemas/newSchema.graphql');
    const badSchemaPath = path.join(__dirname, '../../test/schemas/badSchema.graphql');

    it('ensure comparator correctness', () => {
      const currentSchema = buildSchemaFromFile(oldSchemaPath);
      const nextSchema = buildSchemaFromFile(newSchemaPath);
      const result = SchemaMigrationService.schemaComparator(currentSchema, nextSchema);
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
        - Modify Enum
       */
      const expectResult = require('../../test/schemas/schemaDiff.json');
      expect(JSON.parse(JSON.stringify(result))).toStrictEqual(expectResult);
    });
    it('Determine isRewindable', () => {
      const currentSchema = buildSchemaFromFile(oldSchemaPath);
      const nextSchema = buildSchemaFromFile(badSchemaPath);
      const v = SchemaMigrationService.validateSchemaChanges(currentSchema, nextSchema);
      expect(v).toBe(false);
    });
    it('Ensure iterator logic', () => {
      const currentSchema = buildSchemaFromFile(oldSchemaPath);
      const nextSchema = buildSchemaFromFile(badSchemaPath);
      const projects = new Map<number, any>([
        [4, {schema: nextSchema}],
        [2, {schema: nextSchema}],
        [1, {schema: currentSchema}],
        [3, {schema: currentSchema}],
      ]);

      const v = (ProjectUpgradeSevice as any).rewindableCheck(projects);
      expect(v).toBe(false);
    });
    it('Compare relaionas', () => {
      const relations = [
        {
          from: 'Transfer',
          type: 'belongsTo',
          to: 'Account',
          foreignKey: 'fromId',
        },
        {
          from: 'Transfer',
          type: 'belongsTo',
          to: 'Account',
          foreignKey: 'toId',
        },
        {
          from: 'Transfer',
          type: 'belongsTo',
          to: 'Account',
          foreignKey: 'accountValueId',
        },
        {
          from: 'Account',
          type: 'hasMany',
          to: 'Transfer',
          foreignKey: 'fromId',
          fieldName: 'sentTransfers',
        },
        {
          from: 'Account',
          type: 'hasMany',
          to: 'Transfer',
          foreignKey: 'toId',
          fieldName: 'recievedTransfers',
        },
        {
          from: 'Account',
          type: 'hasMany',
          to: 'Transfer',
          foreignKey: 'accountValueId',
          fieldName: 'oneToManyRelation',
        },
      ];
    });
  });
  it('compare enums on modified enums', () => {
    const currentEnums = [
      {
        name: 'TestEnum',
        values: ['GOOD', 'BAD', 'NEUTRAL', 'CHAOS'],
      } as GraphQLEnumsType,
    ];
    const nextEnum = [
      {
        name: 'TestEnum',
        values: ['GOOD', 'BAD', 'NEUTRAL'],
      } as GraphQLEnumsType,
    ];

    const changes: any = {
      addedEnums: [],
      removedEnums: [],
      modifiedEnums: [],
    };
    compareEnums(currentEnums, nextEnum, changes);
    expect(changes).toStrictEqual({
      addedEnums: [],
      removedEnums: [],
      modifiedEnums: [{name: 'TestEnum', values: ['GOOD', 'BAD', 'NEUTRAL']}],
    });
  });
});
