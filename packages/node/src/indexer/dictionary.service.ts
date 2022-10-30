// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { gql } from '@apollo/client/core';
import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import {
  NodeConfig,
  timeout,
  getLogger,
  DictionaryService as CoreDictionaryService,
  Dictionary,
} from '@subql/node-core';
import { DictionaryQueryEntry } from '@subql/types';
import { buildQuery, GqlNode, GqlQuery, MetaData } from '@subql/utils';
import { SubqueryProject } from '../configure/SubqueryProject';

export type SpecVersion = {
  id: string;
  start: number; //start with this block
  end: number;
};

export type SpecVersionDictionary = {
  _metadata: MetaData;
  specVersions: SpecVersion[];
};

const logger = getLogger('dictionary');

@Injectable()
export class DictionaryService
  extends CoreDictionaryService
  implements OnApplicationShutdown
{
  private mappedDictionaryQueryEntries: Map<number, DictionaryQueryEntry[]>;

  constructor(protected project: SubqueryProject, nodeConfig: NodeConfig) {
    super(project.network.dictionary, nodeConfig);
  }

  parseSpecVersions(raw: SpecVersionDictionary): SpecVersion[] {
    if (raw === undefined) {
      return [];
    }
    const specVersionBlockHeightSet = new Set<SpecVersion>();
    const specVersions = (raw.specVersions as any).nodes;
    const _metadata = raw._metadata;

    // Add range for -1 specVersions
    for (let i = 0; i < specVersions.length - 1; i++) {
      specVersionBlockHeightSet.add({
        id: specVersions[i].id,
        start: Number(specVersions[i].blockHeight),
        end: Number(specVersions[i + 1].blockHeight) - 1,
      });
    }
    if (specVersions && specVersions.length >= 0) {
      // Add range for the last specVersion
      if (_metadata.lastProcessedHeight) {
        specVersionBlockHeightSet.add({
          id: specVersions[specVersions.length - 1].id,
          start: Number(specVersions[specVersions.length - 1].blockHeight),
          end: Number(_metadata.lastProcessedHeight),
        });
      }
    }
    return Array.from(specVersionBlockHeightSet);
  }

  async getSpecVersionsRaw(): Promise<SpecVersionDictionary> {
    const { query } = this.specVersionQuery();
    try {
      const resp = await timeout(
        this.client.query({
          query: gql(query),
        }),
        this.nodeConfig.dictionaryTimeout,
      );

      const _metadata = resp.data._metadata;
      const specVersions = resp.data.specVersions;
      return { _metadata, specVersions };
    } catch (err) {
      logger.warn(err, `failed to fetch specVersion result`);
      return undefined;
    }
  }

  async getSpecVersions(): Promise<SpecVersion[]> {
    try {
      return this.parseSpecVersions(await this.getSpecVersionsRaw());
    } catch {
      return undefined;
    }
  }

  private specVersionQuery(): GqlQuery {
    const nodes: GqlNode[] = [
      {
        entity: '_metadata',
        project: ['lastProcessedHeight', 'genesisHash'],
      },
      {
        entity: 'specVersions',
        project: [
          {
            entity: 'nodes',
            project: ['id', 'blockHeight'],
          },
        ],
        args: {
          orderBy: 'BLOCK_HEIGHT_ASC',
        },
      },
    ];
    return buildQuery([], nodes);
  }

  buildDictionaryEntryMap(
    dataSources: any[],
    getDictionaryQueryEntries: (startBlock: number) => DictionaryQueryEntry[],
  ): void {
    const mappedDictionaryQueryEntries = new Map();

    for (const ds of dataSources) {
      mappedDictionaryQueryEntries.set(
        ds.startBlock,
        getDictionaryQueryEntries(ds.startBlock),
      );
    }
    this.mappedDictionaryQueryEntries = mappedDictionaryQueryEntries;
  }

  private setDictionaryQueryEntries(
    endBlockHeight: number,
  ): DictionaryQueryEntry[] {
    let dictionaryQueryEntries: DictionaryQueryEntry[];

    this.mappedDictionaryQueryEntries.forEach((value, key, map) => {
      if (endBlockHeight >= key) {
        dictionaryQueryEntries = value;
      }
    });

    if (dictionaryQueryEntries === undefined) {
      throw Error('Could not set dictionaryQueryEntries');
    }

    return dictionaryQueryEntries;
  }

  async scopedDictionaryEntries(
    startBlockHeight: number,
    endBlockHeight: number,
    queryEndBlock: number,
    scaledBatchSize: number,
  ): Promise<Dictionary> {
    return this.getDictionary(
      startBlockHeight,
      queryEndBlock,
      scaledBatchSize,
      this.setDictionaryQueryEntries(endBlockHeight),
    );
  }
}
