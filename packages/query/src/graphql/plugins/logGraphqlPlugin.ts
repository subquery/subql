// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {performance} from 'perf_hooks';
import {ApolloServerPlugin} from 'apollo-server-plugin-base';
import {GraphQLRequestListener} from 'apollo-server-plugin-base/src/index';
import {GraphQLRequestContext} from 'apollo-server-types';
import {getLogger} from '../../utils/logger';

const logger = getLogger('graphql');

const getSizeInBytes = (obj: Record<string, unknown>) => {
  const str = JSON.stringify(obj);
  return new TextEncoder().encode(str).length;
};

const getSizeInKilobytes = (obj: Record<string, unknown>) => {
  const bytes = getSizeInBytes(obj);
  const kb = (bytes / 1000).toFixed(2);
  return `${kb}kB`;
};

/* eslint-disable */
export const LogGraphqlPlugin: ApolloServerPlugin = {
  async requestDidStart<MyApolloContext>(
    requestContext: GraphQLRequestContext<MyApolloContext>
  ): Promise<GraphQLRequestListener<MyApolloContext>> {
    const start = performance.now();

    if (requestContext.request.operationName) {
      logger.debug(`operation: ${requestContext.request.operationName}`);
    }

    //IntrospectionQuery payload clutters logs and isn't useful
    if (requestContext.request.operationName !== 'IntrospectionQuery') {
      logger.info('graphql payload: \n' + requestContext.request.query);
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
          const responseData = {};
          responseData['reponseTime'] = `${Math.round(performance.now() - start)}ms`;
          responseData['approximateResponseSize'] = getSizeInKilobytes(response.data);
          logger.info(`response: ` + JSON.stringify(responseData));
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
