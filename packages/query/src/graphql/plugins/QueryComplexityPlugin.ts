// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {separateOperations, parse, DocumentNode, GraphQLSchema, GraphQLError} from 'graphql';
import {getComplexity, simpleEstimator} from 'graphql-query-complexity';

export function validateQueryComplexity(
  document: DocumentNode,
  operationName: string | undefined,
  variables: Record<string, any> | undefined,
  maxComplexity: number | undefined,
  schema: GraphQLSchema
): number {
  const complexity = getComplexity({
    schema,
    query: operationName ? separateOperations(document)[operationName] : document,
    variables,
    estimators: [simpleEstimator({defaultComplexity: 1})],
  });

  // Allow any complexity if maxComplexity is undefined (no limit)
  if (maxComplexity !== undefined && complexity > maxComplexity) {
    throw new GraphQLError(
      `Sorry, too complicated query! Current ${complexity} is over ${maxComplexity} that is the max allowed complexity.`
    );
  }

  return complexity;
}

export function getComplexityValue(
  document: DocumentNode,
  operationName: string | undefined,
  variables: Record<string, any> | undefined,
  schema: GraphQLSchema
): number {
  return getComplexity({
    schema,
    query: operationName ? separateOperations(document)[operationName] : document,
    variables,
    estimators: [simpleEstimator({defaultComplexity: 1})],
  });
}
