// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { SorobanRpc } from 'soroban-client';
import { GetEventsRequest, Server } from 'soroban-client/lib/server';
import { SorobanServer } from './soroban.server';

const MAX_PAGE_SIZE = 10000;

describe('SorobanServer', () => {
  let server: SorobanServer;
  let spy: jest.SpyInstance;
  const url = 'https://example.com';

  beforeEach(() => {
    server = new SorobanServer(url);
    spy = jest.spyOn(Server.prototype, 'getEvents');
  });

  afterEach(() => {
    spy.mockRestore();
  });

  it('should throw EventLimitError when events length crosses max page limit', async () => {
    const request: GetEventsRequest = { startLedger: 1, filters: [] };

    const mockResponse: SorobanRpc.GetEventsResponse = {
      events: Array.from({ length: MAX_PAGE_SIZE }, (_, i) => ({
        ledger: request.startLedger.toString(),
        ledgerClosedAt: null,
        contractId: null,
        id: null,
        pagingToken: null,
        inSuccessfulContractCall: null,
        topic: null,
        value: null,
      })),
    };

    spy.mockResolvedValue(mockResponse);

    await expect(server.getEvents(request)).rejects.toThrow(
      `EventLimitError: block ${request.startLedger} contains more than ${MAX_PAGE_SIZE} events`,
    );
  });
});
