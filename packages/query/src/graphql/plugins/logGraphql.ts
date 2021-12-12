// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {performance} from 'perf_hooks';
import {ApolloServerPlugin} from 'apollo-server-plugin-base';
import {GraphQLRequestListener} from 'apollo-server-plugin-base/src/index';
import {GraphQLRequestContext} from 'apollo-server-types';
import {getLogger} from '../../utils/logger';

const logger = getLogger('graphql');

const getSizeInBytes = (obj: Record<string, unknown>) => {
  let str: string;
  if (typeof obj === 'string') {
    str = obj;
  } else {
    str = JSON.stringify(obj);
  }
  const bytes = new TextEncoder().encode(str).length;
  return bytes;
};

const logSizeInKilobytes = (description: string, obj: Record<string, unknown>) => {
  const bytes = getSizeInBytes(obj);
  const kb = (bytes / 1000).toFixed(2);
  return `${description} approximately ${kb} kB`;
};

/* eslint-disable */
export const LogGraphqlPlugin: ApolloServerPlugin = {
  async requestDidStart<MyApolloContext>(
    requestContext: GraphQLRequestContext<MyApolloContext>
  ): Promise<GraphQLRequestListener<MyApolloContext>> {
    const start = performance.now();

    //IntrospectionQuery clutters logs and isn't useful
    if (requestContext.request.operationName !== 'IntrospectionQuery') {
      logger.debug('graphql payload: \n' + requestContext.request.query);
    }

    return {
      async executionDidStart(_executionRequestContext) {
        return {
          willResolveField({info}) {
            return (_error, result) => {
              if (!result && info.parentType.name === '_Metadata') {
                //Warn as no metadata field should be null
                logger.warn(`${info.parentType.name}.${info.fieldName} returned null`);
              }
            };
          },
        };
      },
      async willSendResponse({response}) {
        if (!response.errors) {
          logger.debug(logSizeInKilobytes('response size:', response.data));
          logger.debug(`response time: ${Math.round(performance.now() - start)}ms`);
        }
      },
      async didEncounterErrors(requestContext) {
        requestContext.errors.forEach((error) => {
          logger.error(error);
        });
      },
    };
  },
};
