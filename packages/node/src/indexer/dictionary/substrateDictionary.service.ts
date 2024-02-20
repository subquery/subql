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
  SubstrateBlock,
  SubstrateDictionaryV1 | SubstrateDictionaryV2
> {
  private async initDictionariesV1(
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
    if (this.nodeConfig.dictionaryResolver) {
      const resolverDictionary = new SubstrateDictionaryV1(
        this.project,
        this.nodeConfig,
        this.eventEmitter,
        this.dsProcessorService.getDsProcessor.bind(this),
      );
      dictionaries = [resolverDictionary];
    } else {
      dictionaries = endpoints.map(
        (endpoint) =>
          new SubstrateDictionaryV1(
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

  private initDictionariesV2(endpoints: string[]): SubstrateDictionaryV2[] {
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
    const dictionaryEndpoints: string[] = !Array.isArray(
      this.project.network.dictionary,
    )
      ? [this.project.network.dictionary]
      : this.project.network.dictionary;
    if (dictionaryEndpoints) {
      for (const endpoint of dictionaryEndpoints) {
        const isV2 = await SubstrateDictionaryV2.isDictionaryV2(
          endpoint,
          this.nodeConfig.dictionaryTimeout,
        );

        if (isV2) {
          dictionaryV2Endpoints.push(endpoint);
        } else {
          // TODO validate dictionary v1 endpoint
          dictionaryV1Endpoints.push(endpoint);
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
