// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { SubqlEventFilter, SubqlCallFilter } from '@subql/common';
import axios from 'axios';

@Injectable()
export class DictionaryService implements OnApplicationShutdown {
  private isShutdown = false;

  onApplicationShutdown(): void {
    this.isShutdown = true;
  }
  dictionaryQuery(
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
    baseQuery = baseQuery.concat(metaQuery);
    baseQuery = baseQuery.concat(specVersionQuery);
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

  async getDictionary(api: string, query: string) {
    let resp;
    try {
      resp = await axios.post(api, {
        query: query,
      });
      return resp.data.data;
    } catch (err) {
      throw new Error(err);
    }
  }

  getBlockBatch(queryResult): number[] {
    let nodes = [];
    if (queryResult.events && queryResult.events.nodes.length >= 0) {
      nodes = nodes.concat(queryResult.events.nodes);
    }
    if (queryResult.extrinsics && queryResult.extrinsics.nodes.length >= 0) {
      nodes = nodes.concat(queryResult.extrinsics.nodes);
    }
    return [...new Set(nodes.map((node) => node.blockHeight))];
  }

  getSpecVersionMap(queryResult) {
    let nodes = [];
    if (
      queryResult.specVersions &&
      queryResult.specVersions.nodes.length >= 0
    ) {
      nodes = nodes.concat(queryResult.specVersions.nodes);
    }
    return [...new Set(nodes.map((node) => node.blockHeight))];
  }
}
