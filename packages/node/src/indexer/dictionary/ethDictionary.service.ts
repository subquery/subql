// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NETWORK_FAMILY } from '@subql/common';
import { NodeConfig, DictionaryService, getLogger } from '@subql/node-core';
import { EthereumBlock, SubqlDatasource } from '@subql/types-ethereum';
import { SubqueryProject } from '../../configure/SubqueryProject';
import { EthereumApiService } from '../../ethereum';
import { EthDictionaryV1 } from './v1';
import { EthDictionaryV2 } from './v2';

const logger = getLogger('dictionary');

@Injectable()
export class EthDictionaryService extends DictionaryService<
  SubqlDatasource,
  EthereumBlock
> {
  constructor(
    @Inject('ISubqueryProject') protected project: SubqueryProject,
    nodeConfig: NodeConfig,
    eventEmitter: EventEmitter2,
    @Inject('APIService') private apiService: EthereumApiService,
  ) {
    super(project.network.chainId, nodeConfig, eventEmitter);
  }

  async initDictionaries(): Promise<void> {
    const dictionariesV1: EthDictionaryV1[] = [];
    const dictionariesV2: EthDictionaryV2[] = [];

    if (!this.project) {
      throw new Error(`Project in Dictionary service not initialized `);
    }

    const dictionaryEndpoints = await this.getDictionaryEndpoints(
      NETWORK_FAMILY.ethereum,
      this.project.network,
    );

    for (const endpoint of dictionaryEndpoints) {
      try {
        const dictionaryV2 = await EthDictionaryV2.create(
          endpoint,
          this.nodeConfig,
          this.project,
          this.apiService.api,
        );
        dictionariesV2.push(dictionaryV2);
      } catch (e) {
        try {
          const dictionaryV1 = await EthDictionaryV1.create(
            this.project,
            this.nodeConfig,
            endpoint,
          );
          dictionariesV1.push(dictionaryV1);
        } catch (e) {
          logger.warn(
            `Dictionary endpoint "${endpoint}" is not a valid dictionary`,
          );
        }
      }
    }
    logger.debug(
      `Dictionary versions, v1: ${dictionariesV1.length}, v2: ${dictionariesV2.length}`,
    );
    // v2 should be prioritised
    this.init([...dictionariesV2, ...dictionariesV1]);
  }
}
