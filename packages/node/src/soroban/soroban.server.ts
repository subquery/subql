// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { getLogger } from '@subql/node-core';
import { Server, SorobanRpc } from 'soroban-client';
import { GetEventsRequest } from 'soroban-client/lib/server';

const logger = getLogger('soroban-server');
const DEFAULT_PAGE_SIZE = 100;

export class SorobanServer extends Server {
  private eventsCache: { [key: number]: SorobanRpc.GetEventsResponse } = {};

  //add events without duplication since fetching happens parallely
  private addEventWithoutDuplication(
    eventArr: SorobanRpc.EventResponse[],
    event: SorobanRpc.EventResponse,
  ): void {
    if (!eventArr.find((existingEvent) => existingEvent.id === event.id)) {
      eventArr.push(event);
    }
  }

  private async fetchEvents(
    request: GetEventsRequest,
  ): Promise<SorobanRpc.GetEventsResponse> {
    request.limit = DEFAULT_PAGE_SIZE;
    const response = await super.getEvents(request);
    return response;
  }

  private splitEvents(
    events: SorobanRpc.EventResponse[],
    sequence: number,
  ): {
    startLedgerEvents: SorobanRpc.EventResponse[];
    otherEvents: SorobanRpc.EventResponse[];
  } {
    const startLedgerEvents = events.filter(
      (event) => parseInt(event.ledger) === sequence,
    );
    const otherEvents = events.filter(
      (event) => parseInt(event.ledger) !== sequence,
    );
    return { startLedgerEvents, otherEvents };
  }

  private updateEventCache(events: SorobanRpc.EventResponse[]): void {
    events.forEach((event) => {
      const ledger = parseInt(event.ledger);
      if (this.eventsCache[ledger]) {
        this.addEventWithoutDuplication(this.eventsCache[ledger].events, event);
      } else {
        this.eventsCache[ledger] = {
          events: [event],
        } as SorobanRpc.GetEventsResponse;
      }
    });
  }

  //fetch events of a ledger from subsequent pages
  private async fetchAdditionalEvents(
    lastRequestLedger: number,
    cursor: string,
    existingEvents: SorobanRpc.EventResponse[],
  ): Promise<SorobanRpc.EventResponse[]> {
    const additionalEvents: SorobanRpc.EventResponse[] = [];
    let innerCursor = cursor;

    //eslint-disable-next-line no-constant-condition
    while (true) {
      const nextRequest: GetEventsRequest = {
        filters: [],
        limit: DEFAULT_PAGE_SIZE,
        cursor: innerCursor,
      };

      const nextResponse = await super.getEvents(nextRequest);

      for (let i = 0; i < nextResponse.events.length; i++) {
        if (parseInt(nextResponse.events[i].ledger) <= lastRequestLedger) {
          // Only add the event if it doesn't already exist in additionalEvents
          if (
            !additionalEvents.find(
              (event) =>
                event.pagingToken === nextResponse.events[i].pagingToken,
            )
          ) {
            additionalEvents.push(nextResponse.events[i]);
          }
          innerCursor = nextResponse.events[i].pagingToken;
        } else {
          break;
        }
      }

      if (
        nextResponse.events.length < DEFAULT_PAGE_SIZE ||
        parseInt(nextResponse.events[nextResponse.events.length - 1].ledger) >
          lastRequestLedger
      ) {
        break;
      }
    }

    // Only add the event to existingEvents if it doesn't already exist in the list
    additionalEvents.forEach((event) => {
      this.addEventWithoutDuplication(existingEvents, event);
    });

    return existingEvents;
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

    let mainCursor: string | undefined;
    let startLedgerEvents: SorobanRpc.EventResponse[] = [];
    let otherEvents: SorobanRpc.EventResponse[] = [];
    let response: SorobanRpc.GetEventsResponse;

    //eslint-disable-next-line no-constant-condition
    while (true) {
      request.cursor = mainCursor;
      if (request.cursor) request.startLedger = undefined; //startLedger and cursor cannot be both set

      response = await this.fetchEvents(request);

      const splitResult = this.splitEvents(response.events, sequence);
      startLedgerEvents = [
        ...startLedgerEvents,
        ...splitResult.startLedgerEvents,
      ];
      otherEvents = [...otherEvents, ...splitResult.otherEvents];

      if (
        response.events.length < DEFAULT_PAGE_SIZE ||
        splitResult.startLedgerEvents.length < DEFAULT_PAGE_SIZE
      ) {
        break;
      }

      mainCursor = response.events[response.events.length - 1].pagingToken;
    }

    if (
      otherEvents.length > 0 &&
      response.events.length === DEFAULT_PAGE_SIZE
    ) {
      mainCursor = response.events[response.events.length - 1].pagingToken;
      const lastRequestLedger = parseInt(
        otherEvents[otherEvents.length - 1].ledger,
      );
      otherEvents = await this.fetchAdditionalEvents(
        lastRequestLedger,
        mainCursor,
        otherEvents,
      );
    }

    this.updateEventCache(otherEvents);

    return { events: startLedgerEvents } as SorobanRpc.GetEventsResponse;
  }
}
