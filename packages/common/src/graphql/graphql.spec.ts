// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import gql from 'graphql-tag';
import {getAllEntitiesRelations} from './entities';
import {buildSchemaFromDocumentNode} from './schema';

describe('utils that handle schema.graphql', () => {
  it('support @entity annotation in the schema', () => {
    const graphqlSchema = gql`
      type KittyBirthInfo @entity {
        id: ID!
        birthBlockHeight: BigInt!
        owner: String!
        birthAt: Date!
      }
    `;
    const schema = buildSchemaFromDocumentNode(graphqlSchema);
    expect(schema).toBeTruthy();
    expect(Object.keys(schema.getTypeMap())).toContain('KittyBirthInfo');
  });
  it('can extract entities from the schema', () => {
    const graphqlSchema = gql`
      type KittyBirthInfo @entity {
        id: ID!
      }
    `;
    const schema = buildSchemaFromDocumentNode(graphqlSchema);
    const entities = getAllEntitiesRelations(schema);
    expect(entities.models).toMatchObject([{name: 'KittyBirthInfo'}]);
    expect(entities.models[0].fields).toEqual([{isArray: false, name: 'id', nullable: false, type: 'ID'}]);
  });

  it('throw error for unsupported types', () => {
    const graphqlSchema = gql`
      type Test @entity {
        id: ID!
        price: Double
      }
    `;
    expect(() => buildSchemaFromDocumentNode(graphqlSchema)).toThrow();
  });

  it('can extract nested models and relations from the schema', () => {
    const graphqlSchema = gql`
      type Account @entity {
        id: ID!
        identity: Identity! @derivedFrom(field: "account")
        transfers: [Transfer] @derivedFrom(field: "from")
      }
      type Transfer @entity {
        id: ID!
        from: Account!
      }
      type Identity @entity {
        id: ID!
        account: Account!
      }
    `;
    const schema = buildSchemaFromDocumentNode(graphqlSchema);
    const entities = getAllEntitiesRelations(schema);
    expect(entities.models).toMatchObject([
      {
        name: 'Account',
        fields: [{name: 'id', type: 'ID', isArray: false, nullable: false}],
      },
      {
        name: 'Transfer',
        fields: [
          {name: 'id', type: 'ID', isArray: false, nullable: false},
          {name: 'fromId', type: 'String', isArray: false, nullable: false},
        ],
      },
      {
        name: 'Identity',
        fields: [
          {name: 'id', type: 'ID', isArray: false, nullable: false},
          {
            name: 'accountId',
            type: 'String',
            isArray: false,
            nullable: false,
          },
        ],
      },
    ]);

    expect(entities.relations).toMatchObject([
      {
        from: 'Account',
        type: 'hasOne',
        to: 'Identity',
        foreignKey: 'accountId',
        fieldName: 'identity',
      },
      {
        from: 'Account',
        type: 'hasMany',
        to: 'Transfer',
        foreignKey: 'fromId',
        fieldName: 'transfers',
      },
      {
        from: 'Transfer',
        type: 'belongsTo',
        to: 'Account',
        foreignKey: 'fromId',
      },
      {
        from: 'Identity',
        type: 'belongsTo',
        to: 'Account',
        foreignKey: 'accountId',
      },
    ]);
  });

  it('throw error if derivedFrom field with missing field name in corresponding entity', () => {
    const graphqlSchema = gql`
      type Account @entity {
        id: ID!
        transfers: [Transfer] @derivedFrom(field: "from")
      }
      type Transfer @entity {
        id: ID!
        #from: Account! # If this is missing
        to: Account!
      }
    `;
    const schema = buildSchemaFromDocumentNode(graphqlSchema);
    expect(() => getAllEntitiesRelations(schema)).toThrow(
      'Please check entity Account with field transfers has correct relation with entity Transfer'
    );
  });

  it('can extract indexed fields from the schema', () => {
    const graphqlSchema = gql`
      type TestEntity @entity {
        id: ID!
        column1: String @index
        column2: BigInt @index(unique: true)
      }
    `;
    const schema = buildSchemaFromDocumentNode(graphqlSchema);
    const entities = getAllEntitiesRelations(schema);
    expect(entities.models?.[0].indexes).toHaveLength(2);
    expect(entities.models?.[0].indexes[0].fields).toEqual(['column1']);
    expect(entities.models?.[0].indexes[0].unique).toBeUndefined();
    expect(entities.models?.[0].indexes[1].fields).toEqual(['column2']);
    expect(entities.models?.[0].indexes[1].unique).toBe(true);
  });

  it('throw if add index on pk', () => {
    const graphqlSchema = gql`
      type TestEntity @entity {
        id: ID! @index
      }
    `;
    const schema = buildSchemaFromDocumentNode(graphqlSchema);
    expect(() => getAllEntitiesRelations(schema)).toThrow(/^index can not be added on field id/);
  });

  it('can extract indexed fields from foreign field', () => {
    const graphqlSchema = gql`
      type Fruit @entity {
        id: ID!
        apple: Apple @index
        banana: [Banana] @index(unique: true)
      }
      type Apple @entity {
        id: ID!
      }
      type Banana @entity {
        id: ID!
      }
    `;
    const schema = buildSchemaFromDocumentNode(graphqlSchema);
    const entities = getAllEntitiesRelations(schema);
    expect(entities.models?.[0].indexes[0].fields).toEqual(['appleId']);
    expect(entities.models?.[0].indexes[0].using).toEqual('hash');
    expect(entities.models?.[0].indexes[1].unique).toBe(true);
  });

  it('can read jsonfield', () => {
    const graphqlSchema = gql`
      type MyJson @jsonField {
        data: String!
        data2: [String]
        data3: MyJson2
      }
      type MyJson2 @jsonField {
        data4: String!
      }
      type Account @entity {
        field6: [MyJson]!
      }
    `;
    const schema = buildSchemaFromDocumentNode(graphqlSchema);
    const accountModel = getAllEntitiesRelations(schema).models.find((model) => model.name === 'Account');
    expect(accountModel.fields[0].type).toBe('Json');
    expect(accountModel.fields[0].jsonInterface.name).toBe('MyJson');
    expect(accountModel.fields[0].isArray).toBeTruthy();
    expect(accountModel.fields[0].jsonInterface.fields[0].nullable).toBeFalsy();
    expect(accountModel.fields[0].jsonInterface.fields[1].isArray).toBeTruthy();
    // allow json in json
    expect(accountModel.fields[0].jsonInterface.fields[2].type).toBe('Json');
    expect(accountModel.fields[0].jsonInterface.fields[2].jsonInterface.name).toBe('MyJson2');
  });
});
