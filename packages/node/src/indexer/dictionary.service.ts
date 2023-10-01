// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { gql } from '@apollo/client/core';
import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  NodeConfig,
  timeout,
  getLogger,
  DictionaryService as CoreDictionaryService,
} from '@subql/node-core';
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
export class DictionaryService extends CoreDictionaryService {
  constructor(
    @Inject('ISubqueryProject') protected project: SubqueryProject,
    nodeConfig: NodeConfig,
    eventEmitter: EventEmitter2,
  ) {
    super(
      project.network.dictionary,
      project.network.chainId,
      nodeConfig,
      eventEmitter,
    );
  }

  protected validateChainMeta(metaData: MetaData): boolean {
    // validate both manifest chainId (genesisHash is deprecated) and endpoint genesisHash with metadata
    return (
      this.endpointGenesisHash === metaData.genesisHash &&
      this.project.network.chainId === metaData.genesisHash
    );
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
}
