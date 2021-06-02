// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { MetaData } from '@subql/common';
import axios from 'axios';
import { NodeConfig } from '../configure/NodeConfig';

type indexEvent = {
  type: string;
  module: string;
  event: string;
};

type indexExtrinsic = {
  type: string;
  module: string;
  call: string;
};

type eventsBatch = {};

type extrinsicBatch = {};
@Injectable()
export class DictionaryService implements OnApplicationShutdown {
  private isShutdown = false;

  onApplicationShutdown(): void {
    this.isShutdown = true;
  }
  dictionaryQuery(
    startBlock: number,
    batchSize: number,
    offset: number,
    indexEvents?: indexEvent[],
    indexExtrinsics?: indexExtrinsic[],
  ): string {
    let eventFilter = ``;
    let extrinsicFilter = ``;
    let baseQuery = ``;
    const metaQuery = `
  Metadata {
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
    baseQuery = baseQuery.concat(metaQuery);
    if (indexEvents.length !== 0) {
      indexEvents.map((event) => {
        eventFilter = eventFilter.concat(`
        {
          and:[
          {module:{equalTo: "${event.module}"}},
          {event:{equalTo:"${event.event}"}}
        ]},`);
      });
      const eventQuery = `events(filter:{
    blockHeight:{greaterThan:"${startBlock}"},
    or:[
     ${eventFilter}
    ]
  }, orderBy:BLOCK_HEIGHT_ASC,first: ${batchSize},offset: ${offset}){
    nodes{
      blockHeight
    }
  }`;
      baseQuery = baseQuery.concat(eventQuery);
    }
    if (indexExtrinsics.length !== 0) {
      indexExtrinsics.map((extrinsic) => {
        extrinsicFilter = extrinsicFilter.concat(`
        {
          and:[
          {module:{equalTo: "${extrinsic.module}"}},
          {call:{equalTo:"${extrinsic.call}"}}
        ]},`);
      });
      const extrinsicQueryQuery = `extrinsics(filter:{
    blockHeight:{greaterThan:"${startBlock}"},
    or:[
     ${extrinsicFilter}
    ]
  }, orderBy:BLOCK_HEIGHT_ASC,first: ${batchSize},offset: ${offset}){
    nodes{
      blockHeight
    }
  }`;
      baseQuery = baseQuery.concat(extrinsicQueryQuery);
    }
    return `query{${baseQuery}}`;
  }

  async getBlockBatch(api: string, query: string) {
    let resp;
    try {
      resp = await axios.post(api, {
        query: query,
      });
    } catch (err) {
      // Handle Error Here
      console.error(err);
    }

    if (resp) {
      const { Metadata, events, extrinsics } = resp.data.data;
      const nodes = events.nodes.concat(extrinsics.nodes);
      return [...new Set(nodes.map((node) => node.blockHeight))];
    }
  }
}
