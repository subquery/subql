// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import {
  NodeConfig,
  DictionaryService as CoreDictionaryService,
} from '@subql/node-core';
import JSON5 from 'json5';
import fetch from 'node-fetch';
import { SubqueryProject } from '../configure/SubqueryProject';

const CHAIN_ALIASES_URL =
  'https://raw.githubusercontent.com/subquery/templates/main/chainAliases.json5';

@Injectable()
export class DictionaryService
  extends CoreDictionaryService
  implements OnApplicationShutdown
{
  private constructor(
    @Inject('ISubqueryProject') protected project: SubqueryProject,
    nodeConfig: NodeConfig,
    chainId?: string,
  ) {
    super(
      project.network.dictionary,
      chainId ?? project.network.chainId,
      nodeConfig,
    );
  }

  static async create(
    project: SubqueryProject,
    nodeConfig: NodeConfig,
  ): Promise<DictionaryService> {
    /*Some dictionarys for EVM are built with other SDKs as they are chains with an EVM runtime
     * we maintain a list of aliases so we can map the evmChainId to the genesis hash of the other SDKs
     * e.g moonbeam is built with Substrate SDK but can be used as an EVM dictionary
     */
    const chainAliases = await this.getEvmChainId();
    const chainAlias = chainAliases[project.network.chainId];

    return new DictionaryService(project, nodeConfig, chainAlias);
  }

  private static async getEvmChainId(): Promise<Record<string, string>> {
    const response = await fetch(CHAIN_ALIASES_URL);

    const raw = await response.text();
    // We use JSON5 here because the file has comments in it
    return JSON5.parse(raw);
  }
}
