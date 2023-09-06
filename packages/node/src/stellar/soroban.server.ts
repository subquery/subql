// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { getLogger } from '@subql/node-core';
import { compact, groupBy, last } from 'lodash';
import { Server, SorobanRpc } from 'soroban-client';
import { GetEventsRequest } from 'soroban-client/lib/server';

const logger = getLogger('stellar-server');
const DEFAULT_PAGE_SIZE = 100;

export class SorobanServer extends Server {
  private eventsCache: { [key: number]: SorobanRpc.GetEventsResponse } = {};

  private async fetchEventsForSequence(
    sequence: number,
    request: GetEventsRequest,
    accEvents: SorobanRpc.EventResponse[] = [],
  ): Promise<{
    events: SorobanRpc.GetEventsResponse;
    eventsToCache: SorobanRpc.GetEventsResponse;
  }> {
    const response = await super.getEvents(request);

    // Separate the events for the current sequence and the subsequent sequences
    const groupedEvents = groupBy(response.events, (event) =>
      parseInt(event.ledger) === sequence ? 'events' : 'eventsToCache',
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
        events: { events: newEvents },
        eventsToCache: { events: eventsToCache },
      };
    }

    if (response.events.length < DEFAULT_PAGE_SIZE) {
      return { events: { events: newEvents }, eventsToCache: { events: [] } };
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
      if (ignoreHeight && ignoreHeight === parseInt(event.ledger)) return;
      const ledger = parseInt(event.ledger);
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
    });
  }

  async getEvents(
    request: GetEventsRequest,
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
