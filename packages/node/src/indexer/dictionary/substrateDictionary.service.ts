// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NETWORK_FAMILY } from '@subql/common';
import {
  DictionaryVersion,
  inspectDictionaryVersion,
  NodeConfig,
} from '@subql/node-core';
import { DictionaryService } from '@subql/node-core/indexer/dictionary/dictionary.service';
import {
  SubstrateBlock,
  SubstrateCustomDatasource,
  SubstrateDatasource,
  SubstrateDatasourceProcessor,
} from '@subql/types';
import { DsProcessor } from '@subql/types-core';
import { SubqueryProject } from '../../configure/SubqueryProject';
import { DsProcessorService } from '../ds-processor.service';
import { SubstrateDictionaryV1 } from './v1/substrateDictionaryV1';
import { SubstrateDictionaryV2 } from './v2';

@Injectable()
export class SubstrateDictionaryService extends DictionaryService<
  SubstrateDatasource,
  SubstrateBlock,
  SubstrateDictionaryV1 | SubstrateDictionaryV2
> {
  protected async initDictionariesV1(
    endpoints: string[],
  ): Promise<SubstrateDictionaryV1[]> {
    if (!this.project) {
      throw new Error(`Project in Dictionary service not initialized `);
    }
    let dictionaries: SubstrateDictionaryV1[] = [];

    const registryDictionary = await this.resolveDictionary(
      NETWORK_FAMILY.substrate,
      this.project.network.chainId,
      this.nodeConfig.dictionaryRegistry,
    );
    if (registryDictionary !== undefined) {
      endpoints.push(registryDictionary);
    }

    // Current We now only accept either resolver dictionary or multiple dictionaries
    // TODO, this may move to core dictionary service
    if (this.nodeConfig.dictionaryResolver) {
      const resolverDictionary = SubstrateDictionaryV1.create(
        this.project,
        this.nodeConfig,
        this.eventEmitter,
        this.dsProcessorService.getDsProcessor.bind(this),
      );
      dictionaries = [resolverDictionary];
    } else {
      dictionaries = endpoints.map((endpoint) =>
        SubstrateDictionaryV1.create(
          this.project,
          this.nodeConfig,
          this.eventEmitter,
          this.dsProcessorService.getDsProcessor.bind(this),
          endpoint,
        ),
      );
    }
    return dictionaries;
  }

  protected initDictionariesV2(endpoints: string[]): SubstrateDictionaryV2[] {
    if (!this.project) {
      throw new Error(`Project in Dictionary service not initialized `);
    }
    const dictionaries = endpoints.map(
      (endpoint) =>
        new SubstrateDictionaryV2(
          endpoint,
          this.nodeConfig,
          this.eventEmitter,
          this.project,
          this.project.network.chainId,
        ),
    );
    return dictionaries;
  }

  async initDictionaries() {
    const dictionaryV1Endpoints = [];
    const dictionaryV2Endpoints = [];
    // TODO, change this to project.network.dictionary when rebase with main, this require update in type-core
    this.project.network.dictionary;
    if (this.nodeConfig.networkDictionaries) {
      for (const endpoint of this.nodeConfig.networkDictionaries) {
        const version = await inspectDictionaryVersion(
          endpoint,
          this.nodeConfig.dictionaryTimeout,
        );

        if (version === DictionaryVersion.v1) {
          dictionaryV1Endpoints.push(endpoint);
        } else if (
          version === DictionaryVersion.v2Complete ||
          version === DictionaryVersion.v2Basic
        ) {
          dictionaryV2Endpoints.push(endpoint);
        } else {
          // When version is undefined, indicate the dictionary is not valid, do not use it
        }
      }
    }
    // Init for dictionary service, construct all dictionaries
    this.init([
      ...(await this.initDictionariesV1(dictionaryV1Endpoints)),
      ...this.initDictionariesV2(dictionaryV2Endpoints),
    ]);

    // Init matadata for all dictionaries
    await Promise.all(this._dictionaries.map((d) => d.init()));
  }

  constructor(
    @Inject('ISubqueryProject') protected project: SubqueryProject,
    nodeConfig: NodeConfig,
    eventEmitter: EventEmitter2,
    protected dsProcessorService: DsProcessorService,
    chainId?: string,
  ) {
    super(chainId ?? project.network.chainId, nodeConfig, eventEmitter);
  }
}
