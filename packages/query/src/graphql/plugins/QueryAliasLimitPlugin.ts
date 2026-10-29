// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {GraphQLError, DocumentNode, visit} from 'graphql';

export function checkAliasLimit(document: DocumentNode, limit: number): number {
  let aliasCount = 0;
  visit(document, {
    Field(node) {
      if (node.alias) {
        aliasCount += 1;
        if (aliasCount > limit) {
          throw new GraphQLError(`Alias limit exceeded. Current count: ${aliasCount}, Limit: ${limit}`);
        }
      }
    },
  });
  return aliasCount;
}

export function getAliasCount(document: DocumentNode): number {
  let aliasCount = 0;
  visit(document, {
    Field(node) {
      if (node.alias) {
        aliasCount += 1;
      }
    },
  });
  return aliasCount;
}
