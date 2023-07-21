// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { getLogger } from '@subql/node-core';
import { Server, SorobanRpc } from 'soroban-client';
import { GetEventsRequest } from 'soroban-client/lib/server';

const logger = getLogger('soroban-server');
const MAX_PAGE_SIZE = 10000;

export class SorobanServer extends Server {
  private eventsCache: { [key: number]: SorobanRpc.GetEventsResponse } = {};

  async getEvents(
    request: GetEventsRequest,
  ): Promise<SorobanRpc.GetEventsResponse> {
    if (this.eventsCache[request.startLedger]) {
      const cachedEvents = this.eventsCache[request.startLedger];
      delete this.eventsCache[request.startLedger];
      return new Promise((resolve) => {
        //resolving immediately will make performance score go to NaN
        setTimeout(() => resolve(cachedEvents), 2);
      });
    }

    request.limit = MAX_PAGE_SIZE;
    const response = await super.getEvents(request);

    const maxEventHeight =
      response.events.length > 0
        ? parseInt(response.events[response.events.length - 1].ledger)
        : request.startLedger;

    for (let h = request.startLedger; h <= maxEventHeight; h++) {
      this.eventsCache[h] = { events: [] } as SorobanRpc.GetEventsResponse;
    }

    response.events.forEach((event) =>
      this.eventsCache[parseInt(event.ledger)].events.push(event),
    );

    //exclude maxEventHeight as some of the events in it might be paginated out
    if (response.events.length === MAX_PAGE_SIZE) {
      if (maxEventHeight === request.startLedger) {
        throw new Error(
          `EventLimitError: block ${request.startLedger} contains more than ${MAX_PAGE_SIZE} events`,
        );
      }

      delete this.eventsCache[maxEventHeight];
    }

    return this.eventsCache[request.startLedger];
  }
}
