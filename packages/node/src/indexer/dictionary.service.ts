// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {
  ApolloClient,
  HttpLink,
  InMemoryCache,
  gql,
} from '@apollo/client/core';
import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { SubqlEventFilter, SubqlCallFilter, MetaData } from '@subql/common';
import fetch from 'node-fetch';
import { SubqueryProject } from '../configure/project.model';
import { ProjectIndexFilters } from './types';

export type Dictionary = {
  _metadata: MetaData;
  batchBlocks: number[];
  //TODO
  // specVersions: number[];
};

@Injectable()
export class DictionaryService implements OnApplicationShutdown {
  private isShutdown = false;

  constructor(protected project: SubqueryProject) {}

  onApplicationShutdown(): void {
    this.isShutdown = true;
  }

  async getDictionary(
    startBlock: number,
    batchSize: number,
    indexFilters: ProjectIndexFilters,
  ): Promise<Dictionary> {
    const query = this.dictionaryQuery(
      startBlock,
      batchSize,
      indexFilters.existEventHandler,
      indexFilters.existExtrinsicHandler,
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

      if (resp.data.events && resp.data.events.nodes.length >= 0) {
        for (const node of resp.data.events.nodes) {
          blockHeightSet.add(Number(node.blockHeight));
        }
      }
      if (resp.data.extrinsics && resp.data.extrinsics.nodes.length >= 0) {
        for (const node of resp.data.extrinsics.nodes) {
          blockHeightSet.add(Number(node.blockHeight));
        }
      }
      if (resp.data.specVersions && resp.data.specVersions.nodes.length >= 0) {
        for (const node of resp.data.specVersions.nodes) {
          specVersionBlockHeightSet.add(Number(node.blockHeight));
        }
      }
      const _metadata = resp.data._metadata;
      const batchBlocks = Array.from(blockHeightSet);
      //TODO
      // const specVersions = Array.from(specVersionBlockHeightSet);
      return {
        _metadata,
        batchBlocks,
      };
    } catch (err) {
      return undefined;
    }
  }

  //generate dictionary query
  private dictionaryQuery(
    startBlock: number,
    batchSize: number,
    existEventHandler: boolean,
    existExtrinsicHandler: boolean,
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
    if (existEventHandler && indexEvents.length !== 0) {
      indexEvents.map((event) => {
        eventFilter = eventFilter.concat(`
        {
          and:[
          {module:{equalTo: "${event.module}"}},
          {event:{equalTo:"${event.method}"}}
        ]},`);
      });
      const eventQuery = `events(filter:{
    blockHeight:{greaterThan:"${startBlock}"},
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
    if (existExtrinsicHandler && indexExtrinsics.length !== 0) {
      indexExtrinsics.map((extrinsic) => {
        extrinsicFilter = extrinsicFilter.concat(`
        {
          and:[
          {module:{equalTo: "${extrinsic.module}"}},
          {call:{equalTo:"${extrinsic.method}"}}
        ]},`);
      });
      const extrinsicQueryQuery = `extrinsics(filter:{
    blockHeight:{greaterThan:"${startBlock}"},
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
