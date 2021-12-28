// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {performance} from 'perf_hooks';
import {ApolloServerPlugin} from 'apollo-server-plugin-base';
import {GraphQLRequestListener} from 'apollo-server-plugin-base/src/index';
import {GraphQLRequestContext} from 'apollo-server-types';
import gql from 'graphql-tag';
import {getLogger} from '../../utils/logger';

const logger = getLogger('graphql');

const getSizeInBytes = (obj: Record<string, unknown>) => {
  const str = JSON.stringify(obj);
  return new TextEncoder().encode(str).length;
};

const getSizeInKilobytes = (obj: Record<string, unknown>) => {
  const bytes = getSizeInBytes(obj);
  const kb = (bytes / 1000).toFixed(2);
  return kb;
};

//TODO: log type of request

/* eslint-disable */
export const LogGraphqlPlugin: ApolloServerPlugin = {
  async requestDidStart<MyApolloContext>(
    requestContext: GraphQLRequestContext<MyApolloContext>
  ): Promise<GraphQLRequestListener<MyApolloContext>> {
    const graphqlData = {} as Record<string, unknown>;
    const payload = {} as Record<string, unknown>;
    const start = performance.now();

    //IntrospectionQuery payload clutters logs and isn't useful
    if (requestContext.request.operationName === 'IntrospectionQuery') {
      return;
    }

    payload['message'] = JSON.stringify(
      gql`
        ${requestContext.request.query}
      `
    );
    payload['originIP'] = requestContext.context['httpHeaders']['x-forwarded-for'] ?? '127.0.0.1';

    return {
      async willSendResponse({response}) {
        payload['responseTime'] = `${Math.round(performance.now() - start)}`;
        payload['responsePayloadSize'] = getSizeInKilobytes(response.data);

        if (!response.errors) {
          payload['responseSuccess'] = 'true';
        } else {
          payload['responseSuccess'] = 'false';
        }

        graphqlData['payload'] = payload;
        logger.info(JSON.stringify(graphqlData));
      },
      async didEncounterErrors(requestContext) {
        const errors = requestContext.errors;
        graphqlData['errors'] = errors;
      },
    };
  },
};
