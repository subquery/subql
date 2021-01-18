// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import gql from 'graphql-tag';
import {buildSchemaFromDocumentNode} from './schema';
import {getAllEntities} from './entities';

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
  });
});
