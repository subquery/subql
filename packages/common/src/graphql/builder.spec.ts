// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {validate} from 'graphql/validation';
import {buildQuery, GqlNode, GqlVar} from './builder';

describe('build gql', () => {
  it('gql 1', () => {
    const vars: GqlVar[] = [
      {
        name: 'e_1_value',
        gqlType: 'String!',
        value: 'balances',
      },
    ];
    const nodes: GqlNode[] = [
      {
        entity: 'specVersions',
        args: {
          filter: {
            blockHeight: {greaterThanOrEqualTo: '"1000"', lessThan: '"100000"'},
          },
        },
        project: [
          {
            entity: 'nodes',
            project: ['id', 'blockHeight'],
          },
        ],
      },
      {
        entity: 'events',
        args: {
          filter: {
            blockHeight: {greaterThanOrEqualTo: '"1000"', lessThan: '"100000"'},
            or: [
              {
                and: [{module: {equalTo: '$e_1_value'}}, {event: {equalTo: '"Transfer"'}}],
              },
            ],
          },
          orderBy: 'BLOCK_HEIGHT_ASC',
          first: '100',
        },
        project: [
          {
            entity: 'nodes',
            project: ['blockHeight'],
          },
        ],
      },
    ];
    const {query, variables} = buildQuery(vars, nodes);
    expect(variables.e_1_value).toBe('balances');
    expect(query).toMatch(/query\(\$e_1_value:String!\)/);
  });
});
