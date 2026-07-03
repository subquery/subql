// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {ASTNode, Kind} from 'graphql';
import {checkDepth, validateQueryDepth} from '../QueryDepthLimitPlugin';

const mockFieldNode = {
  kind: Kind.FIELD,
  name: {kind: 'Name', value: 'field1'},
  selectionSet: {
    kind: Kind.SELECTION_SET,
    selections: [
      {
        kind: Kind.FIELD,
        name: {
          kind: 'Name',
          value: 'field2',
        },
        selectionSet: {
          kind: Kind.SELECTION_SET,
          selections: [
            {
              kind: Kind.FIELD,
              name: {kind: 'Name', value: 'field1'},
            },
          ],
        },
      },
    ],
  },
} as unknown as ASTNode;

describe('checkDepth', () => {
  it('does not throw on shallow depth', () => {
    const depthSoFar = 0;
    const maxDepth = 5;
    expect(() => checkDepth(mockFieldNode, {}, depthSoFar, maxDepth)).not.toThrow();
  });
  it('does throw when max depth is exceeded', () => {
    const depthSoFar = 6;
    const maxDepth = 7;
    expect(() => checkDepth(mockFieldNode, {}, depthSoFar, maxDepth)).toThrow();
  });
});

describe('validateQueryDepth', () => {
  const shallowQuery = `query { users { nodes { name } } }`;
  const deepQuery = `query { users { nodes { posts { nodes { comments { nodes { body } } } } } } }`;
  const fragmentQuery = `
    query { u: users { ...UserFields } }
    fragment UserFields on User {
      name
      posts { nodes { title } }
    }
  `;
  const multiOpQuery = `query Op1 { users { nodes { name } } } query Op2 { posts { nodes { title } } }`;

  it('does not throw on shallow query', () => {
    const doc = {
      kind: Kind.DOCUMENT,
      definitions: [{kind: Kind.OPERATION_DEFINITION, selectionSet: {kind: Kind.SELECTION_SET, selections: []}}],
    } as any;
    expect(() => validateQueryDepth(5, doc.definitions)).not.toThrow();
  });

  it('skips IntrospectionQuery by name', () => {
    const doc = {
      kind: Kind.DOCUMENT,
      definitions: [{name: {kind: Kind.NAME, value: 'IntrospectionQuery'}, kind: Kind.OPERATION_DEFINITION}],
    } as any;
    expect(() => validateQueryDepth(0, doc.definitions)).not.toThrow();
  });

  it('resolves and checks fragment depth', () => {
    const doc = {
      kind: Kind.DOCUMENT,
      definitions: [
        {
          kind: Kind.OPERATION_DEFINITION,
          selectionSet: {
            kind: Kind.SELECTION_SET,
            selections: [{kind: Kind.FIELD, name: {kind: Kind.NAME, value: 'users'}}],
          },
        },
        {
          kind: Kind.FRAGMENT_DEFINITION,
          name: {kind: Kind.NAME, value: 'UserFields'},
          selectionSet: {kind: Kind.SELECTION_SET, selections: []},
        },
      ],
    } as any;
    expect(() => validateQueryDepth(5, doc.definitions)).not.toThrow();
  });

  it('throws on deep query exceeding limit', () => {
    const parsed = require('graphql').parse(deepQuery);
    expect(() => validateQueryDepth(2, parsed.definitions)).toThrow('too deep');
  });

  // ── Edge cases from gap analysis ──────────────────────────────────────

  it('handles inline fragment depth correctly', () => {
    const doc = {
      kind: Kind.DOCUMENT,
      definitions: [
        {
          kind: Kind.OPERATION_DEFINITION,
          selectionSet: {
            kind: Kind.SELECTION_SET,
            selections: [
              {
                kind: Kind.INLINE_FRAGMENT,
                typeCondition: {kind: Kind.NAMED_TYPE, name: {kind: Kind.NAME, value: 'User'}},
                selectionSet: {
                  kind: Kind.SELECTION_SET,
                  selections: [
                    {
                      kind: Kind.FIELD,
                      name: {kind: Kind.NAME, value: 'name'},
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    } as any;
    // Inline fragment should not add depth, so depth=0 should pass
    expect(() => validateQueryDepth(0, doc.definitions)).not.toThrow();
  });

  it('handles mutation operation depth', () => {
    const doc = {
      kind: Kind.DOCUMENT,
      definitions: [
        {
          kind: Kind.OPERATION_DEFINITION,
          operation: 'mutation',
          selectionSet: {
            kind: Kind.SELECTION_SET,
            selections: [
              {
                kind: Kind.FIELD,
                name: {kind: Kind.NAME, value: 'createUser'},
                selectionSet: {
                  kind: Kind.SELECTION_SET,
                  selections: [
                    {
                      kind: Kind.FIELD,
                      name: {kind: Kind.NAME, value: 'id'},
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    } as any;
    expect(() => validateQueryDepth(1, doc.definitions)).not.toThrow();
    expect(() => validateQueryDepth(0, doc.definitions)).toThrow('too deep');
  });

  it('handles fragment spread referencing non-existent fragment gracefully', () => {
    const doc = {
      kind: Kind.DOCUMENT,
      definitions: [
        {
          kind: Kind.OPERATION_DEFINITION,
          selectionSet: {
            kind: Kind.SELECTION_SET,
            selections: [
              {
                kind: Kind.FRAGMENT_SPREAD,
                name: {kind: Kind.NAME, value: 'NonExistentFragment'},
              },
            ],
          },
        },
      ],
    } as any;
    // Should throw because fragments['NonExistentFragment'] is undefined
    expect(() => validateQueryDepth(5, doc.definitions)).toThrow();
  });

  it('handles deeply nested fields with depth limit', () => {
    const parsed = require('graphql').parse(deepQuery);
    // deepQuery has depth 6 (users->nodes->posts->nodes->comments->nodes->body)
    expect(() => validateQueryDepth(6, parsed.definitions)).not.toThrow();
    expect(() => validateQueryDepth(5, parsed.definitions)).toThrow('too deep');
  });

  it('validates each operation in multi-op document', () => {
    const parsed = require('graphql').parse(multiOpQuery);
    // Both operations are shallow (depth 2), so limit=2 should pass
    expect(() => validateQueryDepth(2, parsed.definitions)).not.toThrow();
  });
});
