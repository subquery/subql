// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NETWORK_FAMILY } from '@subql/common';
import {
  NodeConfig,
  DictionaryService as CoreDictionaryService,
  getLogger,
} from '@subql/node-core';
import { MetaData } from '@subql/utils';
import JSON5 from 'json5';
import { SubqueryProject } from '../configure/SubqueryProject';

const CHAIN_ALIASES_URL =
  'https://raw.githubusercontent.com/subquery/templates/main/chainAliases.json5';

const logger = getLogger('dictionary');

@Injectable()
export class DictionaryService extends CoreDictionaryService {
  private constructor(
    @Inject('ISubqueryProject') protected project: SubqueryProject,
    nodeConfig: NodeConfig,
    eventEmitter: EventEmitter2,
    chainId?: string,
    dictionaryUrl?: string,
  ) {
    super(
      dictionaryUrl ?? project.network.dictionary,
      chainId ?? project.network.chainId,
      nodeConfig,
      eventEmitter,
    );
  }

  static async create(
    project: SubqueryProject,
    nodeConfig: NodeConfig,
    eventEmitter: EventEmitter2,
  ): Promise<DictionaryService> {
    /*Some dictionarys for EVM are built with other SDKs as they are chains with an EVM runtime
     * we maintain a list of aliases so we can map the evmChainId to the genesis hash of the other SDKs
     * e.g moonbeam is built with Substrate SDK but can be used as an EVM dictionary
     */
    const chainAliases = await this.getEvmChainId();
    const chainAlias = chainAliases[project.network.chainId];

    const url =
      project.network.dictionary ??
      (await CoreDictionaryService.resolveDictionary(
        NETWORK_FAMILY.ethereum,
        chainAlias,
        nodeConfig.dictionaryRegistry,
      ));

    return new DictionaryService(
      project,
      nodeConfig,
      eventEmitter,
      chainAlias,
      url,
    );
  }

  protected validateChainMeta(metaData: MetaData): boolean {
    // Due to dictionary metadata doesn't include chainId, in here we only validate endpoint genesisHash with metadata
    return this.apiGenesisHash === metaData.genesisHash;
  }

  private static async getEvmChainId(): Promise<Record<string, string>> {
    try {
      // Use fetch added in nodejs 18, it is missing from @types/node though so we need the cast
      const response = await (global as any).fetch(CHAIN_ALIASES_URL);
      const raw = await response.text();

      // We use JSON5 here because the file has comments in it
      return JSON5.parse(raw);
    } catch (e) {
      logger.warn(
        e,
        `Unable to get chain aliases. If you're using a Substrate based network with EVM then the dictionary may not work`,
      );
      return {};
    }
  }
}
