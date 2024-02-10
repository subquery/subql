// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Model, ModelAttributeColumnOptions, ModelStatic} from '@subql/x-sequelize';
import {formatReferences} from './sequelizeUtil';
import {
  generateForeignKeyStatement,
  generateCreateIndexStatement,
  generateCreateTableStatement,
  sortModels,
  getFkConstraint,
} from './sync-helper';

describe('sync-helper', () => {
  const mockModel = {
    schema: {
      name: 'test',
    },
    tableName: 'test-table',
    options: {
      indexes: [
        {
          fields: ['from_id', '_block_range'],
          unique: false,
          using: 'gist',
          name: '0xf48017d5c5d3d768',
          type: '',
          parser: null,
        },
        {
          fields: ['id'],
          unique: false,
          name: '0xb91efc8ed4021e6e',
          type: '',
          parser: null,
        },
      ],
    },
    getAttributes: () => {
      return {
        // ID
        id: {
          type: 'text',
          comment: 'id field is always required and must look like this',
          allowNull: false,
          primaryKey: false,
          fieldName: 'id',
          _modelAttribute: true,
          field: 'id',
        },
        // BIGINT
        amount: {
          type: 'numeric',
          comment: 'Amount that is transferred',
          allowNull: false,
          primaryKey: false,
          fieldName: 'amount',
          _modelAttribute: true,
          field: 'amount',
        },
        // TIMESTAMP
        date: {
          type: 'timestamp',
          comment: 'The date of the transfer',
          allowNull: false,
          primaryKey: false,
          fieldName: 'date',
          _modelAttribute: true,
          field: 'date',
        },
        // RELATION with HISTORICAL
        fromId: {
          type: 'text',
          comment: 'The account that transfers are made from',
          allowNull: false,
          primaryKey: false,
          fieldName: 'fromId',
          _modelAttribute: true,
          field: 'from_id',
        },
        // UUID
        __id: {
          type: {
            key: 'UUID',
          },
          defaultValue: {},
          allowNull: false,
          primaryKey: true,
          fieldName: '__id',
          _modelAttribute: true,
          field: '_id',
        },
        // HISTORICAL RANGE
        __block_range: {
          type: {
            key: 'RANGE',
            _subtype: 'BIGINT',
            options: {
              subtype: {
                options: {},
              },
            },
          },
          allowNull: false,
          fieldName: '__block_range',
          _modelAttribute: true,
          field: '_block_range',
        },
        // NULLABLE
        lastTransferBlock: {
          type: 'integer',
          comment: 'The most recent block on which we see a transfer involving this account',
          allowNull: true,
          primaryKey: false,
          fieldName: 'lastTransferBlock',
          _modelAttribute: true,
          field: 'last_transfer_block',
        },
      };
    },
  } as unknown as ModelStatic<Model<any, any>>;

  it('Ensure correct fkConstraint', () => {
    console.log(getFkConstraint('many_to_many_test_entities', 'AccountId'));
    expect(getFkConstraint('ManyToManyTestEntities', 'AccountId')).toBe('many_to_many_test_entities_account_id_fkey');
  });
  it('Generate SQL statement for table creation with historical', () => {
    const statement = generateCreateTableStatement(mockModel, 'test');
    const expectedStatement = [
      'CREATE TABLE IF NOT EXISTS "test"."test-table" ("id" text NOT NULL,\n      "amount" numeric NOT NULL,\n      "date" timestamp NOT NULL,\n      "from_id" text NOT NULL,\n      "_id" UUID NOT NULL,\n      "_block_range" int8range NOT NULL,\n      "last_transfer_block" integer, PRIMARY KEY ("_id"));',

      `COMMENT ON COLUMN "test"."test-table"."id" IS 'id field is always required and must look like this';`,
      `COMMENT ON COLUMN "test"."test-table"."amount" IS 'Amount that is transferred';`,
      `COMMENT ON COLUMN "test"."test-table"."date" IS 'The date of the transfer';`,
      `COMMENT ON COLUMN "test"."test-table"."from_id" IS 'The account that transfers are made from';`,
      `COMMENT ON COLUMN "test"."test-table"."last_transfer_block" IS 'The most recent block on which we see a transfer involving this account';`,
    ];
    expect(statement).toStrictEqual(expectedStatement);
  });
  it('Generate SQL statement for Indexes', () => {
    const statement = generateCreateIndexStatement(
      mockModel.options.indexes as any,
      mockModel.schema.name,
      mockModel.tableName
    );
    expect(statement).toStrictEqual([
      `CREATE  INDEX "0xf48017d5c5d3d768" ON "test"."${mockModel.tableName}" USING gist ("from_id", "_block_range");`,
      `CREATE  INDEX "0xb91efc8ed4021e6e" ON "test"."${mockModel.tableName}"  ("id");`,
    ]);
  });
  it('Generate table statement no historical, no multi primary keys', () => {
    jest.spyOn(mockModel, 'getAttributes').mockImplementationOnce(() => {
      return {
        id: {
          type: 'text',
          comment: 'id field is always required and must look like this',
          allowNull: false,
          primaryKey: true,
          fieldName: 'id',
          _modelAttribute: true,
          field: 'id',
        },
      };
    });
    const statement = generateCreateTableStatement(mockModel, 'test');

    // Correcting the expected statement to reflect proper SQL syntax
    //     const expectedStatement = `
    //         CREATE TABLE IF NOT EXISTS "test"."test-table" (
    //       "id" text NOT NULL PRIMARY KEY
    //     );
    //
    // COMMENT ON COLUMN "test"."test-table"."id" IS 'id field is always required and must look like this';`.trim();

    expect(statement).toStrictEqual([
      `CREATE TABLE IF NOT EXISTS "test"."test-table" ("id" text NOT NULL, PRIMARY KEY ("id"));`,
      `COMMENT ON COLUMN "test"."test-table"."id" IS 'id field is always required and must look like this';`,
    ]);
  });
  it('Reference statement', () => {
    const attribute = {
      type: 'text',
      comment: 'The account that transfers are made from',
      allowNull: false,
      primaryKey: false,
      fieldName: 'fromId',
      _modelAttribute: true,
      field: 'from_id',
      references: {
        model: {
          tableName: 'accounts',
          table: 'accounts',
          name: 'Account',
          schema: 't-sync-4',
          delimiter: '.',
        },
        key: 'id',
      },
      onDelete: 'NO ACTION',
      onUpdate: 'CASCADE',
    } as ModelAttributeColumnOptions;

    const statement = formatReferences(attribute, 'test');
    expect(statement).toBe(`REFERENCES "test"."accounts" ("id") ON DELETE NO ACTION ON UPDATE CASCADE`);
  });
  it('Ensure correct foreignkey statement', () => {
    jest.spyOn(mockModel, 'getAttributes').mockImplementationOnce(() => {
      return {
        transferIdId: {
          type: 'text',
          comment: undefined,
          allowNull: false,
          primaryKey: false,
          field: 'transfer_id_id',
          references: {
            model: {
              schema: 'test',
              tableName: 'transfers',
            },
            key: 'id',
          },
          onDelete: 'NO ACTION',
          onUpdate: 'CASCADE',
        },
      } as any;
    });

    const referenceQueries: string[] = [];
    Object.values(mockModel.getAttributes()).forEach((a) => {
      const refStatement = generateForeignKeyStatement(a, mockModel.tableName);
      if (refStatement) {
        referenceQueries.push(refStatement);
      }
    });

    expect(referenceQueries[0]).toBe(
      `ALTER TABLE "test"."test-table"
      ADD FOREIGN KEY (transfer_id_id) 
      REFERENCES "test"."transfers" ("id") ON DELETE NO ACTION ON UPDATE CASCADE;`
    );
  });
  it('sortModel with toposort on cyclic schema', () => {
    const mockRelations = [
      {
        from: 'Transfer',
        to: 'Account',
      },
      {
        from: 'Account',
        to: 'Transfer',
      },
    ] as any[];
    const mockModels = new Map([
      ['Transfer', {} as any],
      ['Account', {} as any],
    ]) as any;
    expect(sortModels(mockRelations, mockModels)).toBe(null);
  });
  it('sortModel with toposort on non cyclic schema', () => {
    const mockRelations = [
      {
        from: 'Transfer',
        to: 'TestEntity',
      },
      {
        from: 'Account',
        to: 'TestEntity',
      },
    ] as any[];
    const mockModels = {
      Transfer: {
        tableName: 'transfers',
      },
      Account: {
        tableName: 'accounts',
      },
      TestEntity: {
        tableName: 'test_entities',
      },
      LonelyEntity: {
        tableName: 'lonely_Entities',
      },
    } as Record<string, any>;
    expect(sortModels(mockRelations, mockModels)?.map((t) => t.tableName)).toStrictEqual([
      'lonely_Entities',
      'accounts',
      'transfers',
      'test_entities',
    ]);
  });
});
