// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

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
    expect(entities.models[0].fields).toEqual([
      {isArray: false, name: 'id', nullable: false, type: 'ID', isEnum: false},
    ]);
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

  it('support Bytes and Float types', () => {
    const graphqlSchema = gql`
      type Test @entity {
        id: ID!
        hash: Bytes
        rate: Float
      }
    `;
    const schema = buildSchemaFromDocumentNode(graphqlSchema);
    const entities = getAllEntitiesRelations(schema);
    expect(entities.models[0].fields[1].type).toBe('Bytes');
    expect(entities.models[0].fields[2].type).toBe('Float');
  });

  it('throw error for union/enum/interface type', () => {
    const graphqlSchema = gql`
      type Test @entity {
        id: ID!
        unionKind: unionResult
        enumKind: enumResult
        who: Character
      }
      interface Character {
        id: ID!
        name: String!
      }
      union unionResult = Human | Droid | Starship
      type Human @entity {
        id: ID!
      }
      type Droid @entity {
        id: ID!
      }
      type Starship @entity {
        id: ID!
      }
      enum enumResult {
        NEWHOPE
        EMPIRE
        JEDI
      }
    `;
    expect(() => {
      const schema = buildSchemaFromDocumentNode(graphqlSchema);
      getAllEntitiesRelations(schema);
    }).toThrow(/Not support/);
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
        apple: Apple
        banana: [Banana] @derivedFrom(field: "fruit")
      }
      type Fruit2 @entity {
        id: ID!
        apple: Apple @index
      }
      type Apple @entity {
        id: ID!
      }
      type Banana @entity {
        id: ID!
        fruit: Fruit
      }
    `;
    const schema = buildSchemaFromDocumentNode(graphqlSchema);
    const entities = getAllEntitiesRelations(schema);
    expect(entities.models?.[0].indexes[0].fields).toEqual(['appleId']);
    expect(entities.models?.[0].indexes[0].using).toEqual('hash');
    expect(entities.models?.[0].indexes[0].unique).toBe(false);

    expect(entities.models?.[1].indexes[0].fields).toEqual(['appleId']);
    expect(entities.models?.[1].indexes[0].unique).toBe(false);
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
        id: ID!
      }
    `;
    const schema = buildSchemaFromDocumentNode(graphqlSchema);
    const accountModel = getAllEntitiesRelations(schema).models.find((model) => model.name === 'Account');
    expect(accountModel?.fields[0].type).toBe('Json');
    expect(accountModel?.fields[0].jsonInterface?.name).toBe('MyJson');
    expect(accountModel?.fields[0].isArray).toBeTruthy();
    expect(accountModel?.fields[0].jsonInterface?.fields[0].nullable).toBeFalsy();
    expect(accountModel?.fields[0].jsonInterface?.fields[1].isArray).toBeTruthy();
    // allow json in json
    expect(accountModel?.fields[0].jsonInterface?.fields[2].type).toBe('Json');
    expect(accountModel?.fields[0].jsonInterface?.fields[2].jsonInterface?.name).toBe('MyJson2');
  });

  it('can read jsonfield with indexed option', () => {
    const graphqlSchema = gql`
      type MyJson @jsonField(indexed: false) {
        data: String!
        data2: [String]
      }
      type MyJson2 @jsonField(indexed: true) {
        data: String!
        data2: [String]
      }
      type MyJson3 @jsonField {
        data: String!
        data2: [String]
      }
      type Account @entity {
        field1: MyJson!
        field2: MyJson2!
        field3: MyJson3!
        id: ID!
      }
    `;
    const schema = buildSchemaFromDocumentNode(graphqlSchema);
    const entities = getAllEntitiesRelations(schema);

    expect(entities.models?.[0].indexes.length).toEqual(2);
    expect(entities.models?.[0].indexes[0].fields).toEqual(['field2']);
    expect(entities.models?.[0].indexes[1].fields).toEqual(['field3']);
  });

  it('can read composite index', () => {
    const graphqlSchema = gql`
      type StarterEntity @entity @compositeIndexes(fields: [["field1", "field2"], ["field2", "field3"]]) {
        id: ID! #id is a required field
        field1: Int!
        field2: String #field2 is an optional field
        field3: String
      }
    `;
    const schema = buildSchemaFromDocumentNode(graphqlSchema);
    const entities = getAllEntitiesRelations(schema);
    expect(entities.models?.[0].indexes[0].fields).toEqual(['field1', 'field2']);
  });

  it('can create composite index for fk field', () => {
    const graphqlSchema = gql`
      type StarterEntity @entity @compositeIndexes(fields: [["field1", "field2"], ["field2", "relate"]]) {
        id: ID! #id is a required field
        field1: Int!
        field2: String
        relate: RelateEntity
      }
      type RelateEntity @entity {
        id: ID! #id is a required field
      }
    `;
    const schema = buildSchemaFromDocumentNode(graphqlSchema);
    const entities = getAllEntitiesRelations(schema);
    expect(entities.models?.[0].indexes[2].fields).toEqual(['field2', 'relateId']);
  });

  it('will throw if composite index field not found within entity', () => {
    const graphqlSchema = gql`
      type StarterEntity @entity @compositeIndexes(fields: [["field1", "field5"]]) {
        id: ID!
        field1: Int!
        field2: String
      }
    `;
    const schema = buildSchemaFromDocumentNode(graphqlSchema);
    expect(() => getAllEntitiesRelations(schema)).toThrow(/not found within entity/);
  });

  it('will throw when found duplicate composite index', () => {
    const graphqlSchema = gql`
      type StarterEntity
        @entity
        @compositeIndexes(fields: [["field1", "field2"], ["field2", "field3"], ["field3", "field2"]]) {
        id: ID!
        field1: Int!
        field2: String
        field3: String
      }
    `;
    const schema = buildSchemaFromDocumentNode(graphqlSchema);
    expect(() => getAllEntitiesRelations(schema)).toThrow(/Found duplicate composite indexes/);
  });

  it('will throw if number of composite indexes excess limit', () => {
    const graphqlSchema = gql`
      type StarterEntity @entity @compositeIndexes(fields: [["id", "field1", "field2", "field3"]]) {
        id: ID!
        field1: Int!
        field2: String
        field3: String
      }
    `;
    const schema = buildSchemaFromDocumentNode(graphqlSchema);
    expect(() => getAllEntitiesRelations(schema)).toThrow(
      /Composite index on entity StarterEntity expected not more than 3 fields,/
    );
  });

  it('can read fulltext directive', () => {
    const graphqlSchema = gql`
      type StarterEntity @entity @fullText(fields: ["field2", "field3"], language: "english") {
        id: ID! #id is a required field
        field1: Int!
        field2: String #field2 is an optional field
        field3: String
      }
    `;

    const schema = buildSchemaFromDocumentNode(graphqlSchema);
    const entities = getAllEntitiesRelations(schema);

    expect(entities.models?.[0].fullText?.fields).toEqual(['field2', 'field3']);
  });

  it('can throw fulltext directive when field doesnt exist on entity', () => {
    const graphqlSchema = gql`
      type StarterEntity @entity @fullText(fields: ["field2", "not_exists"], language: "english") {
        id: ID! #id is a required field
        field1: Int!
        field2: String #field2 is an optional field
        field3: String
      }
    `;

    const schema = buildSchemaFromDocumentNode(graphqlSchema);
    expect(() => getAllEntitiesRelations(schema)).toThrow(
      `Field "not_exists" in fullText directive doesn't exist on entity "StarterEntity"`
    );
  });

  it('can throw fulltext directive when field isnt a string', () => {
    const graphqlSchema = gql`
      type StarterEntity @entity @fullText(fields: ["field1"], language: "english") {
        id: ID! #id is a required field
        field1: Int!
        field2: String #field2 is an optional field
        field3: String
      }
    `;

    const schema = buildSchemaFromDocumentNode(graphqlSchema);
    expect(() => getAllEntitiesRelations(schema)).toThrow(`fullText directive fields only supports String types`);
  });

  it('will throw if entity missing id field', () => {
    const graphqlSchema = gql`
      type StarterEntity @entity {
        field1: Int!
        field2: String #field2 is an optional field
        field3: String
      }
    `;

    const schema = buildSchemaFromDocumentNode(graphqlSchema);
    expect(() => getAllEntitiesRelations(schema)).toThrow(`Entity "StarterEntity" is missing required id field.`);
  });

  it('will throw if entity id field isnt id', () => {
    const graphqlSchema = gql`
      type StarterEntity @entity {
        id: Int!
        field1: Int!
        field2: String #field2 is an optional field
        field3: String
      }
    `;

    const schema = buildSchemaFromDocumentNode(graphqlSchema);
    expect(() => getAllEntitiesRelations(schema)).toThrow(`Entity "StarterEntity" type must be ID, received Int`);
  });

  it('will throw if 1 to Many relationship is missing directive', () => {
    const graphqlSchema = gql`
      type Fruit @entity {
        id: ID!
        bananas: [Banana!]!
      }
      type Banana @entity {
        id: ID!
      }
    `;

    const schema = buildSchemaFromDocumentNode(graphqlSchema);
    expect(() => getAllEntitiesRelations(schema)).toThrow(
      `Field "bananas" on entity "Fruit" is missing "derivedFrom" directive. Please also make sure "Banana" has a field of type "Fruit".`
    );
  });
});
