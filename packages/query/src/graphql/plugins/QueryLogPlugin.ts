// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import type {ApolloServerPlugin} from 'apollo-server-plugin-base';
import {getLogger} from '../../utils/logger';

const logger = getLogger('query');

export function queryLogPlugin(): ApolloServerPlugin {
  return {
    requestDidStart: (request) => {
      const body = request.request;
      if ('operationName' in body && body.query) {
        if (body.operationName !== 'IntrospectionQuery') {
          logger.info(JSON.stringify(body.query));
        }
      }
    },
  } as unknown as ApolloServerPlugin;
}
