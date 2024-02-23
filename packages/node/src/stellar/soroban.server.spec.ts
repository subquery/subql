// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { SorobanRpc } from 'stellar-sdk';
import { SorobanServer } from './soroban.server';

const DEFAULT_PAGE_SIZE = 100;

describe('SorobanServer', () => {
  let server: SorobanServer;
  const url = 'https://example.com';
  let spy: jest.SpyInstance;

  beforeEach(() => {
    server = new SorobanServer(url);
    spy = jest.spyOn(SorobanRpc.Server.prototype, 'getEvents');
  });

  afterEach(() => {
    spy.mockRestore();
  });

  test('should handle no events', async () => {
    spy.mockResolvedValue({ events: [] });

    const response = await server.getEvents({
      startLedger: 1,
    } as SorobanRpc.Server.GetEventsRequest);

    expect(response).toEqual({ events: [] });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  test('should handle events from different ledgers', async () => {
    // Should be BaseEventResponse type
    spy.mockResolvedValue({
      events: [
        { id: '1', ledger: 1, pagingToken: '1' },
        { id: '2', ledger: 2, pagingToken: '2' },
      ],
      latestLedger: 5,
    });

    const response = await server.getEvents({
      startLedger: 1,
    } as SorobanRpc.Server.GetEventsRequest);

    expect(response).toEqual({
      events: [{ id: '1', ledger: 1, pagingToken: '1' }],
      latestLedger: 5,
    });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  test('should handle response length less than DEFAULT_PAGE_SIZE', async () => {
    spy.mockResolvedValue({
      events: Array.from({ length: DEFAULT_PAGE_SIZE - 1 }, (_, i) => ({
        id: `${i}`,
        ledger: 1,
        pagingToken: `${i}`,
      })),
    });

    const response = await server.getEvents({
      startLedger: 1,
    } as SorobanRpc.Server.GetEventsRequest);

    expect(response.events.length).toBe(DEFAULT_PAGE_SIZE - 1);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  test('should handle no matching ledger', async () => {
    spy.mockResolvedValue({
      events: [
        { id: '1', ledger: 2, pagingToken: '1' },
        { id: '1', ledger: 3, pagingToken: '2' },
      ],
    });

    const response = await server.getEvents({
      startLedger: 1,
    } as SorobanRpc.Server.GetEventsRequest);

    expect(response).toEqual({ events: [] });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  test('should return cached events for given startLedger', async () => {
    (server as any).eventsCache[1] = {
      events: [{ ledger: 1, pagingToken: '1' }],
    };

    const response = await server.getEvents({
      startLedger: 1,
    } as SorobanRpc.Server.GetEventsRequest);

    expect(response).toEqual({ events: [{ ledger: 1, pagingToken: '1' }] });
    expect(spy).toHaveBeenCalledTimes(0);
  });

  test('should handle startLedger events greater than DEFAULT_PAGE_SIZE', async () => {
    spy
      .mockResolvedValueOnce({
        events: Array.from({ length: DEFAULT_PAGE_SIZE }, (_, i) => ({
          id: `${i}`,
          ledger: 1,
          pagingToken: `${i}`,
        })),
      })
      .mockResolvedValueOnce({
        events: Array.from({ length: 5 }, (_, i) => ({
          id: `${i + DEFAULT_PAGE_SIZE}`,
          ledger: 1,
          pagingToken: `${i + DEFAULT_PAGE_SIZE}`,
        })),
      });

    const response = await server.getEvents({
      startLedger: 1,
    } as SorobanRpc.Server.GetEventsRequest);

    expect(response.events.length).toBe(DEFAULT_PAGE_SIZE + 5);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  test('should handle last block of otherEvents on next page', async () => {
    spy
      .mockResolvedValueOnce({
        events: [
          ...Array.from({ length: DEFAULT_PAGE_SIZE - 1 }, (_, i) => ({
            id: `${i}`,
            ledger: 1,
            pagingToken: `${i}`,
          })),
          { id: '2-1', ledger: 2, pagingToken: '1' },
        ],
      })
      .mockResolvedValueOnce({
        events: [{ id: '2-2', ledger: 2, pagingToken: '2' }],
      });

    const response = await server.getEvents({
      startLedger: 1,
    } as SorobanRpc.Server.GetEventsRequest);

    expect(response).toEqual({
      events: [
        ...Array.from({ length: DEFAULT_PAGE_SIZE - 1 }, (_, i) => ({
          id: `${i}`,
          ledger: 1,
          pagingToken: `${i}`,
        })),
      ],
    });
    expect((server as any).eventsCache[2]).toBeUndefined();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
