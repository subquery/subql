// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type {ApolloServerPlugin} from 'apollo-server-plugin-base';
import {separateOperations, GraphQLSchema} from 'graphql';
import {getComplexity, simpleEstimator, fieldExtensionsEstimator} from 'graphql-query-complexity';

export function queryComplexityPlugin(options: {schema: GraphQLSchema; maxComplexity: number}): ApolloServerPlugin {
  return {
    requestDidStart: () => {
      return {
        didResolveOperation({document, request}) {
          const complexity = getComplexity({
            schema: options.schema,
            query: request.operationName ? separateOperations(document)[request.operationName] : document,
            variables: request.variables,
            estimators: [simpleEstimator({defaultComplexity: 1})],
          });
          if (complexity > options.maxComplexity) {
            throw new Error(
              `Sorry, too complicated query! Current ${complexity} is over ${options.maxComplexity} that is the max allowed complexity.`
            );
          }
        },
      };
    },
  } as unknown as ApolloServerPlugin;
}
