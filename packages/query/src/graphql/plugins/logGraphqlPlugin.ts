// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {ApolloServerPlugin} from 'apollo-server-plugin-base';
import {GraphQLRequestListener} from 'apollo-server-plugin-base/src/index';
import {GraphQLRequestContext} from 'apollo-server-types';
import {stringify} from 'flatted';
import gql from 'graphql-tag';

/* eslint-disable @typescript-eslint/require-await */
export const LogGraphqlPlugin: ApolloServerPlugin = {
  async requestDidStart<MyApolloContext>(
    requestContext: GraphQLRequestContext<MyApolloContext>
  ): Promise<GraphQLRequestListener<MyApolloContext>> {
    const payload = {} as Record<string, unknown>;

    //IntrospectionQuery payload clutters logs and isn't useful
    if (requestContext.request.operationName === 'IntrospectionQuery') {
      return;
    }

    payload.query = gql`
      ${requestContext.request.query}
    `;

    return {
      async willSendResponse({response}) {
        let message = '';

        if (!response.errors) {
          message = 'Graphql request completed successfully';
        } else {
          message = 'Encountered errors during parsing, validating, or executing the GraphQL query';
        }

        requestContext.response.http.headers.set('payload', stringify(payload));
        requestContext.response.http.headers.set('message', message);
      },
      async didEncounterErrors(requestContext) {
        requestContext.response.http.headers.set('stack', stringify(requestContext.errors));
      },
    };
  },
};
