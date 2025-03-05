// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NETWORK_FAMILY } from '@subql/common';
import { SubqlStellarDataSource } from '@subql/common-stellar';
import {
  NodeConfig,
  DictionaryService,
  getLogger,
  DsProcessorService,
} from '@subql/node-core';
import { StellarBlock } from '@subql/types-stellar';
import { SubqueryProject } from '../../configure/SubqueryProject';
import { StellarDictionaryV1 } from './v1';

const logger = getLogger('StellarDictionary');

@Injectable()
export class StellarDictionaryService extends DictionaryService<
  SubqlStellarDataSource,
  StellarBlock
> {
  async initDictionaries(): Promise<void> {
    const dictionariesV1: StellarDictionaryV1[] = [];

    if (!this.project) {
      throw new Error(`Project in Dictionary service not initialized `);
    }
    const registryDictionaries = await this.resolveDictionary(
      NETWORK_FAMILY.stellar,
      this.project.network.chainId,
      this.nodeConfig.dictionaryRegistry,
    );

    logger.debug(`Dictionary registry endpoints: ${registryDictionaries}`);

    const dictionaryEndpoints: string[] = (
      !Array.isArray(this.project.network.dictionary)
        ? !this.project.network.dictionary
          ? []
          : [this.project.network.dictionary]
        : this.project.network.dictionary
    ).concat(registryDictionaries);

    for (const endpoint of dictionaryEndpoints) {
      try {
        const dictionaryV1 = await StellarDictionaryV1.create(
          this.project,
          this.nodeConfig,
          this.dsProcessorService.getDsProcessor.bind(this.dsProcessorService),
          endpoint,
        );
        dictionariesV1.push(dictionaryV1);
      } catch (e) {
        logger.warn(
          `Dictionary endpoint "${endpoint}" is not a valid dictionary`,
        );
      }
    }
    this.init(dictionariesV1);
  }

  constructor(
    @Inject('ISubqueryProject') protected project: SubqueryProject,
    nodeConfig: NodeConfig,
    eventEmitter: EventEmitter2,
    protected dsProcessorService: DsProcessorService,
  ) {
    super(project.network.chainId, nodeConfig, eventEmitter);
  }
}
