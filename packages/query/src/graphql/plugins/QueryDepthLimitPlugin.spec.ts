// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {ASTNode, Kind} from 'graphql';
import {checkDepth} from './QueryDepthLimitPlugin';

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

describe('Query depth limit', () => {
  it('checkDepth does not throw on shallow depth', () => {
    const depthSoFar = 0;
    const maxDepth = 5;
    expect(() => checkDepth(mockFieldNode, {}, depthSoFar, maxDepth)).not.toThrow();
  });
  it('checkDepth does throw when max depth is exceeded', () => {
    const depthSoFar = 6;
    const maxDepth = 7;
    expect(() => checkDepth(mockFieldNode, {}, depthSoFar, maxDepth)).toThrow();
  });
});
