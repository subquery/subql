// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {
  ApolloClient,
  HttpLink,
  InMemoryCache,
  gql,
} from '@apollo/client/core';
import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { MetaData } from '@subql/common';
import { SubqlCallFilter, SubqlEventFilter } from '@subql/types';
import fetch from 'node-fetch';
import { SubqueryProject } from '../configure/project.model';
import { getLogger } from '../utils/logger';
import { profiler } from '../utils/profiler';
import { getYargsOption } from '../yargs';
import { ProjectIndexFilters } from './types';

export type Dictionary = {
  _metadata: MetaData;
  batchBlocks: number[];
  //TODO
  // specVersions: number[];
};
const logger = getLogger('dictionary');
const { argv } = getYargsOption();

@Injectable()
export class DictionaryService implements OnApplicationShutdown {
  private isShutdown = false;

  constructor(protected project: SubqueryProject) {}

  onApplicationShutdown(): void {
    this.isShutdown = true;
  }

  /**
   *
   * @param startBlock
   * @param queryEndBlock this block number will limit the max query range, increase dictionary query speed
   * @param batchSize
   * @param indexFilters
   */

  @profiler(argv.profiler)
  async getDictionary(
    startBlock: number,
    queryEndBlock: number,
    batchSize: number,
    indexFilters: ProjectIndexFilters,
  ): Promise<Dictionary> {
    const query = this.dictionaryQuery(
      startBlock,
      queryEndBlock,
      batchSize,
      indexFilters.eventFilters,
      indexFilters.extrinsicFilters,
    );
    const client = new ApolloClient({
      cache: new InMemoryCache({ resultCaching: true }),
      link: new HttpLink({ uri: this.project.network.dictionary, fetch }),
      defaultOptions: {
        watchQuery: {
          fetchPolicy: 'no-cache',
        },
        query: {
          fetchPolicy: 'no-cache',
        },
      },
    });

    try {
      const resp = await client.query({
        query: gql(query),
      });
      const blockHeightSet = new Set<number>();
      const specVersionBlockHeightSet = new Set<number>();
      let eventEndBlock: number;
      let extrinsicEndBlock: number;

      if (resp.data.events && resp.data.events.nodes.length >= 0) {
        for (const node of resp.data.events.nodes) {
          blockHeightSet.add(Number(node.blockHeight));
          eventEndBlock = Number(node.blockHeight); //last added event blockHeight
        }
      }
      if (resp.data.extrinsics && resp.data.extrinsics.nodes.length >= 0) {
        for (const node of resp.data.extrinsics.nodes) {
          blockHeightSet.add(Number(node.blockHeight));
          extrinsicEndBlock = Number(node.blockHeight); //last added extrinsic blockHeight
        }
      }
      if (resp.data.specVersions && resp.data.specVersions.nodes.length >= 0) {
        for (const node of resp.data.specVersions.nodes) {
          specVersionBlockHeightSet.add(Number(node.blockHeight));
        }
      }
      const _metadata = resp.data._metadata;
      const endBlock = Math.min(
        isNaN(eventEndBlock) ? Infinity : eventEndBlock,
        isNaN(extrinsicEndBlock) ? Infinity : extrinsicEndBlock,
      );
      const batchBlocks = Array.from(blockHeightSet)
        .filter((block) => block <= endBlock)
        .sort((n1, n2) => n1 - n2);
      //TODO
      // const specVersions = Array.from(specVersionBlockHeightSet);
      return {
        _metadata,
        batchBlocks,
      };
    } catch (err) {
      logger.warn(err, `failed to fetch dictionary result`);
      return undefined;
    }
  }

  //generate dictionary query
  private dictionaryQuery(
    startBlock: number,
    queryEndBlock: number,
    batchSize: number,
    indexEvents?: SubqlEventFilter[],
    indexExtrinsics?: SubqlCallFilter[],
  ): string {
    let eventFilter = ``;
    let extrinsicFilter = ``;
    let baseQuery = ``;
    const metaQuery = `
  _metadata {
    lastProcessedHeight
    lastProcessedTimestamp
    targetHeight
    chain
    specName
    genesisHash
    indexerHealthy
    indexerNodeVersion
    queryNodeVersion
  }`;
    const specVersionQuery = `
     specVersions{
        nodes{
          id
          blockHeight
        }
      }`;
    baseQuery = baseQuery.concat(metaQuery, specVersionQuery);
    if (indexEvents.length > 0) {
      indexEvents.map((event) => {
        eventFilter = eventFilter.concat(`
        {
          and:[
          {module:{equalTo: "${event.module}"}},
          {event:{equalTo:"${event.method}"}}
        ]},`);
      });
      const eventQuery = `events(filter:{
    blockHeight:{greaterThanOrEqualTo:"${startBlock}",  lessThan: "${queryEndBlock}"},
    or:[
     ${eventFilter}
    ]
  }, orderBy:BLOCK_HEIGHT_ASC,first: ${batchSize}){
    nodes{
      blockHeight
    }
  }`;
      baseQuery = baseQuery.concat(eventQuery);
    }
    if (indexExtrinsics.length > 0) {
      indexExtrinsics.map((extrinsic) => {
        extrinsicFilter = extrinsicFilter.concat(`
        {
          and:[
          {module:{equalTo: "${extrinsic.module}"}},
          {call:{equalTo:"${extrinsic.method}"}}
        ]},`);
      });
      const extrinsicQueryQuery = `extrinsics(filter:{
    blockHeight:{greaterThanOrEqualTo:"${startBlock}", lessThan: "${queryEndBlock}"},
    or:[
     ${extrinsicFilter}
    ]
  }, orderBy:BLOCK_HEIGHT_ASC,first: ${batchSize}){
    nodes{
      blockHeight
    }
  }`;
      baseQuery = baseQuery.concat(extrinsicQueryQuery);
    }
    return `query{${baseQuery}}`;
  }
}
