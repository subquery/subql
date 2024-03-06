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
  async initDictionaries() {
    let dictionaryV1Endpoints: string[] = [];
    const dictionariesV2: SubstrateDictionaryV2[] = [];

    if (!this.project) {
      throw new Error(`Project in Dictionary service not initialized `);
    }
    const registryDictionaries = await this.resolveDictionary(
      NETWORK_FAMILY.substrate,
      this.project.network.chainId,
      this.nodeConfig.dictionaryRegistry,
    );

    const dictionaryEndpoints: string[] = (
      !Array.isArray(this.project.network.dictionary)
        ? !this.project.network.dictionary
          ? []
          : [this.project.network.dictionary]
        : this.project.network.dictionary
    ).concat(registryDictionaries);

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

    if (this.nodeConfig.dictionaryResolver) {
      // Create a v1 dictionary with dictionary resolver
      // future resolver should a URL, and fetched from registryDictionaries
      dictionaryV1Endpoints = dictionaryV1Endpoints.concat([undefined]);
    }
    // v2 should be prioritised
    this.init([
      ...dictionariesV2,
      ...(await Promise.all(
        dictionaryV1Endpoints.map((endpoint) =>
          SubstrateDictionaryV1.create(
            this.project,
            this.nodeConfig,
            this.eventEmitter,
            this.dsProcessorService.getDsProcessor.bind(this),
            endpoint,
          ),
        ),
      )),
    ]);
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
