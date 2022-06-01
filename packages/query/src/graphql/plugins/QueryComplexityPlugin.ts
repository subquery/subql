// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type {ApolloServerPlugin} from 'apollo-server-plugin-base';
import {separateOperations, GraphQLSchema} from 'graphql';
import {getComplexity, simpleEstimator} from 'graphql-query-complexity';

export function queryComplexityPlugin(options: {schema: GraphQLSchema; maxComplexity: number}): ApolloServerPlugin {
  return {
    requestDidStart: () => {
      let complexity: number;
      return {
        didResolveOperation({document, request}) {
          complexity = getComplexity({
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
        willSendResponse({response}) {
          response.http.headers.append('query-complexity', complexity);
          if (options.maxComplexity !== undefined) {
            response.http.headers.append('max-query-complexity', options.maxComplexity);
          }
        },
      };
    },
  } as unknown as ApolloServerPlugin;
}
