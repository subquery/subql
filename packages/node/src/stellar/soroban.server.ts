// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { getLogger } from '@subql/node-core';
import { SorobanRpcEventResponse } from '@subql/types-stellar';
import { compact, groupBy, last } from 'lodash';
import { Server, SorobanRpc } from 'soroban-client';

const logger = getLogger('stellar-server');
const DEFAULT_PAGE_SIZE = 100;

export class SorobanServer extends Server {
  private eventsCache: { [key: number]: SorobanRpc.GetEventsResponse } = {};
  latestLedger?: number;

  private async fetchEventsForSequence(
    sequence: number,
    request: Server.GetEventsRequest,
    accEvents: SorobanRpcEventResponse[] = [],
  ): Promise<{
    events: SorobanRpc.GetEventsResponse;
    eventsToCache: SorobanRpc.GetEventsResponse;
  }> {
    const response = await super.getEvents(request);

    // Separate the events for the current sequence and the subsequent sequences
    const groupedEvents = groupBy(response.events, (event) =>
      event.ledger === sequence ? 'events' : 'eventsToCache',
    );
    const events = compact(groupedEvents.events);
    let eventsToCache = compact(groupedEvents.eventsToCache);

    // Update the accumulated events with the events from the current sequence
    const newEvents = accEvents.concat(events);

    if (eventsToCache?.length) {
      if (response.events.length === DEFAULT_PAGE_SIZE) {
        const lastSequence = last(response.events).ledger;
        eventsToCache = eventsToCache.filter(
          (event) => event.ledger !== lastSequence,
        );
      }
      return {
        events: { events: newEvents, latestLedger: response.latestLedger },
        eventsToCache: {
          events: eventsToCache,
          latestLedger: response.latestLedger,
        },
      };
    }

    if (response.events.length < DEFAULT_PAGE_SIZE) {
      return {
        events: { events: newEvents, latestLedger: response.latestLedger },
        eventsToCache: { events: [], latestLedger: response.latestLedger },
      };
    }

    // Prepare the next request
    const nextRequest = {
      ...request,
      cursor: response.events[response.events.length - 1]?.pagingToken,
      startLedger: undefined,
    };

    // Continue fetching events for the sequence
    return this.fetchEventsForSequence(sequence, nextRequest, newEvents);
  }

  private updateEventCache(
    response: SorobanRpc.GetEventsResponse,
    ignoreHeight?: number,
  ): void {
    response.events.forEach((event) => {
      if (ignoreHeight && ignoreHeight === event.ledger) return;
      const ledger = event.ledger;
      if (!this.eventsCache[ledger]) {
        this.eventsCache[ledger] = {
          events: [],
        } as SorobanRpc.GetEventsResponse;
      }
      const eventExists = this.eventsCache[ledger].events.some(
        (existingEvent) => existingEvent.id === event.id,
      );
      if (!eventExists) {
        this.eventsCache[ledger].events.push(event);
      }
      this.updateCacheLatestLedger(response.latestLedger);
    });
  }

  updateCacheLatestLedger(latestLedger: number): void {
    if (this.latestLedger && this.latestLedger < latestLedger) {
      this.latestLedger = latestLedger;
    }
  }

  async getEvents(
    request: Server.GetEventsRequest,
  ): Promise<SorobanRpc.GetEventsResponse> {
    const sequence = request.startLedger;

    if (this.eventsCache[sequence]) {
      const cachedEvents = this.eventsCache[sequence];
      delete this.eventsCache[sequence];
      return cachedEvents;
    }

    const response = await this.fetchEventsForSequence(sequence, request);
    this.updateEventCache(response.eventsToCache, sequence);

    return response.events;
  }
}
