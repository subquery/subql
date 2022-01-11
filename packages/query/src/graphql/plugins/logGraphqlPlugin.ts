// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {ApolloServerPlugin} from 'apollo-server-plugin-base';
import {GraphQLRequestListener} from 'apollo-server-plugin-base/src/index';
import {GraphQLRequestContext} from 'apollo-server-types';
import {stringify} from 'flatted';

/* eslint-disable @typescript-eslint/require-await */
export const LogGraphqlPlugin: ApolloServerPlugin = {
  async requestDidStart<MyApolloContext>(
    requestContext: GraphQLRequestContext<MyApolloContext>
  ): Promise<GraphQLRequestListener<MyApolloContext>> {
    
    return {
      async willSendResponse({response}) {
        let message = '';

        if (!response.errors) {
          if (requestContext.request.operationName === 'IntrospectionQuery') {
            message = 'Graphql IntrospectionQuery completed successfully';
          } else {
            message = 'Graphql Query completed successfully';
          }
        } else {
          message = 'Encountered errors during parsing, validating, or executing the GraphQL query';
        }

        requestContext.response.http.headers.set('message', message);
      },
      async didEncounterErrors(requestContext) {
        requestContext.response.http.headers.set('stack', stringify(requestContext.errors));
      },
    };
  },
};
