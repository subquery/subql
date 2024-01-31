// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import type {ApolloServerPlugin} from 'apollo-server-plugin-base';
import {GraphQLSchema, GraphQLError, DocumentNode, visit} from 'graphql';

function checkLimit(document: DocumentNode, limit: number): void {
  let aliasCount = 0;
  visit(document, {
    Field(node) {
      if (node.alias) {
        aliasCount += 1;
        if (aliasCount > limit) throw new GraphQLError('Alias limit exceeded');
      }
    },
  });
}

export function queryAliasLimit(options: {schema: GraphQLSchema; limit?: number}): ApolloServerPlugin {
  return {
    requestDidStart: () => {
      return {
        didResolveOperation(context: {document: DocumentNode}) {
          if (options?.limit === undefined) {
            return;
          }
          checkLimit(context.document, options.limit);
        },
      };
    },
  } as unknown as ApolloServerPlugin;
}
