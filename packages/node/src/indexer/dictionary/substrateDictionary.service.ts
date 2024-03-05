// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NETWORK_FAMILY } from '@subql/common';
import { NodeConfig, DictionaryService } from '@subql/node-core';
import { SubstrateBlock, SubstrateDatasource } from '@subql/types';
import { SubqueryProject } from '../../configure/SubqueryProject';
import { DsProcessorService } from '../ds-processor.service';
import { SpecVersion, SpecVersionDictionary } from './types';
import { SubstrateDictionaryV1 } from './v1/substrateDictionaryV1';
import { SubstrateDictionaryV2 } from './v2';

@Injectable()
export class SubstrateDictionaryService extends DictionaryService<
  SubstrateDatasource,
  SubstrateBlock
> {
  private async initDictionariesV1(
    endpoints: string[],
  ): Promise<SubstrateDictionaryV1[]> {
    if (!this.project) {
      throw new Error(`Project in Dictionary service not initialized `);
    }
    let dictionaries: SubstrateDictionaryV1[];

    const registryDictionary = await this.resolveDictionary(
      NETWORK_FAMILY.substrate,
      this.project.network.chainId,
      this.nodeConfig.dictionaryRegistry,
    );
    if (registryDictionary !== undefined) {
      endpoints.push(registryDictionary);
    }

    // Current We now only accept either resolver dictionary or multiple dictionaries
    if (this.nodeConfig.dictionaryResolver) {
      const resolverDictionary = await SubstrateDictionaryV1.create(
        this.project,
        this.nodeConfig,
        this.eventEmitter,
        this.dsProcessorService.getDsProcessor.bind(this),
      );
      dictionaries = [resolverDictionary];
    } else {
      dictionaries = await Promise.all(
        endpoints.map((endpoint) =>
          SubstrateDictionaryV1.create(
            this.project,
            this.nodeConfig,
            this.eventEmitter,
            this.dsProcessorService.getDsProcessor.bind(this),
            endpoint,
          ),
        ),
      );
    }
    return dictionaries;
  }

  async initDictionaries() {
    const dictionaryV1Endpoints = [];
    const dictionaryEndpoints: string[] = !Array.isArray(
      this.project.network.dictionary,
    )
      ? !this.project.network.dictionary
        ? []
        : [this.project.network.dictionary]
      : this.project.network.dictionary;
    if (dictionaryEndpoints.length) {
      const dictionariesV2: SubstrateDictionaryV2[] = [];
      for (const endpoint of dictionaryEndpoints) {
        try {
          const dictionaryV2 = await SubstrateDictionaryV2.create(
            endpoint,
            this.nodeConfig,
            this.eventEmitter,
            this.project,
            this.project.network.chainId,
          );
          dictionariesV2.push(dictionaryV2);
        } catch (e) {
          dictionaryV1Endpoints.push(endpoint);
        }
      }
      this.init([
        ...(await this.initDictionariesV1(dictionaryV1Endpoints)),
        ...dictionariesV2,
      ]);
    }
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

  async getSpecVersions(): Promise<SpecVersion[]> {
    const currentDictionary = this._dictionaries[
      this._currentDictionaryIndex
    ] as SubstrateDictionaryV1;
    if (!currentDictionary) {
      throw new Error(
        `Runtime service getSpecVersions use current dictionary failed`,
      );
    }
    return currentDictionary.getSpecVersions();
  }

  parseSpecVersions(raw: SpecVersionDictionary): SpecVersion[] {
    const currentDictionary = this._dictionaries[
      this._currentDictionaryIndex
    ] as SubstrateDictionaryV1;
    if (!currentDictionary) {
      throw new Error(
        `Runtime service parseSpecVersions use current dictionary failed`,
      );
    }
    return currentDictionary.parseSpecVersions(raw);
  }
}
