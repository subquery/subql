// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import gql from 'graphql-tag';
import {getAllEntities,getAllEntitiesRelations} from './entities';
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
        birthBlockHeight: BigInt!
        owner: String!
      }
    `;
    const schema = buildSchemaFromDocumentNode(graphqlSchema);
    const entities = getAllEntities(schema);
    expect(entities).toMatchObject([{name: 'KittyBirthInfo'}]);
    expect(Object.keys(entities[0].getFields())).toEqual(expect.arrayContaining(['id', 'birthBlockHeight', 'owner']));
  });
  it('throw error for unsupported types', () => {
    const graphqlSchema = gql`
      type Test @entity {
        id: ID!
        price: Double
      }
    `;
    expect(() => buildSchemaFromDocumentNode(graphqlSchema)).toThrow();
    expect(() => buildSchemaFromDocumentNode(gql`
      type Test @entity {
        id: ID!
        price: [String]
      }
    `)).toThrow();
  });

  it('can extract list field with entity from the schema', () => {
    const graphqlSchema = gql`
      type KittyBirthInfo @entity {
        id: ID!,
        owner: String,
        paper: paper @derivedFrom(field: "account")
      }
      type paper @entity {
        id: ID!
        account: KittyBirthInfo
      }
    `;
    const schema = buildSchemaFromDocumentNode(graphqlSchema);
    const entities = getAllEntitiesRelations(schema);
    expect(entities.models).toMatchObject(
        [{
          name: 'KittyBirthInfo',
          fields: [
            { name: 'id', type: 'ID', isArray: false, nullable: false },
            { name: 'owner', type: 'String', isArray: false, nullable: true }
          ]
        }, {name:'paper', fields: [
            { name: 'id', type: 'ID', isArray: false, nullable: false },
            {
              name: 'accountId',
              type: 'String',
              isArray: false,
              nullable: true
            }
          ]}]
    );

    expect(entities.relations).toMatchObject(
        [{
          from: 'paper',
          type: 'belongsTo',
          to: 'KittyBirthInfo',
          foreignKey: 'accountId'
        }, {
          from: 'KittyBirthInfo',
          type: 'hasOne',
          to: 'paper',
          foreignKey: 'accountId',
          fieldName: 'paper'}]
    );

  });

});
