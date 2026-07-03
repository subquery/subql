// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {buildSchema, parse, GraphQLSchema} from 'graphql';
import {validateQueryComplexity} from '../QueryComplexityPlugin';

const schema: GraphQLSchema = buildSchema(`
  type Query {
    users: UserConnection
    posts: PostConnection
  }
  type UserConnection { nodes: [User] }
  type User {
    name: String
    posts: PostConnection
  }
  type PostConnection { nodes: [Post] }
  type Post {
    title: String
    comments: CommentConnection
  }
  type CommentConnection { nodes: [Comment] }
  type Comment { body: String }
`);

const simpleQuery = `query { users { nodes { name } } }`;
const deepQuery = `query { users { nodes { name posts { nodes { title comments { nodes { body } } } } } } }`;
const multiOpQuery = `query Op1 { users { nodes { name } } } query Op2 { posts { nodes { title } } }`;
const introspectionQuery = `query IntrospectionQuery { __schema { queryType { name } } }`;

describe('QueryComplexityPlugin', () => {
  it('does not throw when complexity is within limit', () => {
    const doc = parse(simpleQuery);
    expect(() => validateQueryComplexity(doc, undefined, undefined, 10, schema)).not.toThrow();
  });

  it('throws when complexity exceeds limit', () => {
    const doc = parse(deepQuery);
    expect(() => validateQueryComplexity(doc, undefined, undefined, 1, schema)).toThrow('too complicated query');
  });

  it('includes complexity value in error message', () => {
    const doc = parse(deepQuery);
    expect(() => validateQueryComplexity(doc, undefined, undefined, 1, schema)).toThrow(/MaxComplexity|1/);
  });

  it('separates multi-operation document by operationName', () => {
    const doc = parse(multiOpQuery);
    const separateResult = require('graphql').separateOperations(doc);

    expect(Object.keys(separateResult)).toHaveLength(2);
    expect(() => validateQueryComplexity(separateResult.Op1, undefined, undefined, 10, schema)).not.toThrow();
    expect(() => validateQueryComplexity(separateResult.Op2, undefined, undefined, 10, schema)).not.toThrow();
  });

  it('skips IntrospectionQuery', () => {
    const doc = parse(introspectionQuery);
    expect(() => validateQueryComplexity(doc, 'IntrospectionQuery', undefined, 1, schema)).not.toThrow();
  });

  it('validates complexity of specified operation only', () => {
    const doc = parse(multiOpQuery);
    expect(() => validateQueryComplexity(doc, 'Op1', undefined, 10, schema)).not.toThrow();
  });

  it('throws when specified operation exceeds limit', () => {
    const doc = parse(multiOpQuery);
    expect(() => validateQueryComplexity(doc, 'Op1', undefined, 0, schema)).toThrow();
  });
});
