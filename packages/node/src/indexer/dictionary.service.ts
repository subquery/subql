// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { gql } from '@apollo/client/core';
import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import {
  NodeConfig,
  DictionaryService as CoreDictionaryService,
  timeout,
  getLogger,
} from '@subql/node-core';
import { SubqueryProject } from '../configure/SubqueryProject';

const logger = getLogger('dictionary');

@Injectable()
export class DictionaryService
  extends CoreDictionaryService
  implements OnApplicationShutdown
{
  constructor(
    @Inject('ISubqueryProject') protected project: SubqueryProject,
    nodeConfig: NodeConfig,
  ) {
    super(project.network.dictionary, project.network.chainId, nodeConfig);
  }

  async getEvmChainId(): Promise<string> {
    const query = `query{chainAlias(id: "evmChainId"){value}}`;

    try {
      const resp = await timeout(
        this.client.query({
          query: gql(query),
        }),
        this.nodeConfig.dictionaryTimeout,
      );
      return resp.data.chainAlias.value;
    } catch (e) {
      logger.debug(`Dictionary doesn't have an evmChainId set`);
      return undefined;
    }
  }
}
