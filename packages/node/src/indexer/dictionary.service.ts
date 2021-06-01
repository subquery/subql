// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class DictionaryService implements OnApplicationShutdown {
  private isShutdown = false;

  onApplicationShutdown(): void {
    this.isShutdown = true;
  }

  queryDictionary(indexEvents?, indexExtrinsics?): string {
    let eventFilter = ``;
    let extrinsicFilter = ``;
    let baseQuery = ``;
    const metaQuery = `
  Metadata {
    currentProcessingHeight
    currentProcessingTimestamp
    lastProcessedHeight
    lastProcessedTimestamp
    chain
    targetHeight
    genesisHash
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
    or:[
     ${eventFilter}
    ]
  }){
    totalCount
    nodes{
      id,
      blockHeight
      module
      event
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
    or:[
     ${extrinsicFilter}
    ]
  }){
    totalCount
    nodes{
      id,
      blockHeight
      module
      call
    }
  }`;
      baseQuery = baseQuery.concat(extrinsicQueryQuery);
    }
    return `query{${baseQuery}}`;
  }
}
