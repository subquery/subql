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
import { ProjectIndexFilters } from './types';

export type Dictionary = {
  _metadata: MetaData;
  batchBlocks: number[];
  specVersions: number[];
};

@Injectable()
export class DictionaryService implements OnApplicationShutdown {
  private isShutdown = false;

  onApplicationShutdown(): void {
    this.isShutdown = true;
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

  async getDictionary(
    startBlock: number,
    batchSize: number,
    api: string,
    indexFilters: ProjectIndexFilters,
  ): Promise<Dictionary> {
    let resp;
    const query = this.dictionaryQuery(
      startBlock,
      batchSize,
      indexFilters.existEventHandler,
      indexFilters.existExtrinsicHandler,
      indexFilters.eventFilters,
      indexFilters.extrinsicFilters,
    );
    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link: new HttpLink({ uri: api, fetch }),
    });
    try {
      resp = await client.query({
        query: gql(query),
      });
      const blockHeightSet = new Set<number>();
      const specVersionBlockHeightSet = new Set<number>();

      if (resp.data.events && resp.data.events.nodes.length >= 0) {
        for (const node of resp.data.events.nodes) {
          blockHeightSet.add(node.blockHeight);
        }
      }
      if (resp.data.extrinsics && resp.data.extrinsics.nodes.length >= 0) {
        for (const node of resp.data.extrinsics.nodes) {
          blockHeightSet.add(node.blockHeight);
        }
      }
      if (resp.data.specVersions && resp.data.specVersions.nodes.length >= 0) {
        for (const node of resp.data.specVersions.nodes) {
          specVersionBlockHeightSet.add(node.blockHeight);
        }
      }
      const _metadata = resp.data._metadata;
      const batchBlocks = Array.from(blockHeightSet);
      const specVersions = Array.from(specVersionBlockHeightSet);

      return { _metadata, batchBlocks, specVersions };
    } catch (err) {
      throw new Error(err);
    }
  }
}
