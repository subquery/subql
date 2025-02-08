// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {ApiErrorType} from '../api.connection.error';
import {ConnectionPoolItem, ConnectionPoolStateManager} from './connectionPoolState.manager';

describe('ConnectionPoolStateManager', function () {
  let connectionPoolStateManager: ConnectionPoolStateManager<any>;
  const EXAMPLE_ENDPOINT1 = 'http://example1.com';
  const EXAMPLE_ENDPOINT2 = 'http://example2.com';

  beforeEach(function () {
    connectionPoolStateManager = new ConnectionPoolStateManager();
  });

  afterEach(async function () {
    await connectionPoolStateManager.onApplicationShutdown();
  });

  it('chooses primary endpoint first', async function () {
    await connectionPoolStateManager.addToConnections(EXAMPLE_ENDPOINT1, true);
    await connectionPoolStateManager.addToConnections(EXAMPLE_ENDPOINT2, false);

    expect(await connectionPoolStateManager.getNextConnectedEndpoint()).toEqual(EXAMPLE_ENDPOINT1);
  });

  it('does not choose primary endpoint if failed', async function () {
    await connectionPoolStateManager.addToConnections(EXAMPLE_ENDPOINT1, true);
    await connectionPoolStateManager.addToConnections(EXAMPLE_ENDPOINT2, false);

    await connectionPoolStateManager.handleApiError(EXAMPLE_ENDPOINT1, ApiErrorType.Default);

    expect(await connectionPoolStateManager.getNextConnectedEndpoint()).toEqual(EXAMPLE_ENDPOINT2);
  });

  it('All endpoints backoff; select a rateLimited endpoint. reason: ApiErrorType.Timeout', async function () {
    await connectionPoolStateManager.addToConnections(EXAMPLE_ENDPOINT1, false);
    await connectionPoolStateManager.addToConnections(EXAMPLE_ENDPOINT2, false);

    await connectionPoolStateManager.handleApiError(EXAMPLE_ENDPOINT1, ApiErrorType.Default);
    await connectionPoolStateManager.handleApiError(EXAMPLE_ENDPOINT2, ApiErrorType.Timeout);

    const nextEndpoint = await connectionPoolStateManager.getNextConnectedEndpoint();
    const endpointInfo = (connectionPoolStateManager as any).pool[EXAMPLE_ENDPOINT2] as ConnectionPoolItem<any>;
    expect(nextEndpoint).toEqual(EXAMPLE_ENDPOINT2);
    expect(endpointInfo.rateLimited).toBe(true);
  });

  it('All endpoints backoff; select a rateLimited endpoint. reason: ApiErrorType.RateLimit', async function () {
    await connectionPoolStateManager.addToConnections(EXAMPLE_ENDPOINT1, false);
    await connectionPoolStateManager.addToConnections(EXAMPLE_ENDPOINT2, false);

    await connectionPoolStateManager.handleApiError(EXAMPLE_ENDPOINT1, ApiErrorType.Default);
    await connectionPoolStateManager.handleApiError(EXAMPLE_ENDPOINT2, ApiErrorType.RateLimit);

    const nextEndpoint = await connectionPoolStateManager.getNextConnectedEndpoint();
    const endpointInfo = (connectionPoolStateManager as any).pool[EXAMPLE_ENDPOINT2] as ConnectionPoolItem<any>;
    expect(nextEndpoint).toEqual(EXAMPLE_ENDPOINT2);
    expect(endpointInfo.rateLimited).toBe(true);
  });

  it('can calculate performance score for response time of zero', function () {
    const score = (connectionPoolStateManager as any).calculatePerformanceScore(0, 0);
    expect(score).not.toBeNaN();
  });

  it('performance score decreases with increasing response time', function () {
    const score1 = (connectionPoolStateManager as any).calculatePerformanceScore(1, 0);
    const score2 = (connectionPoolStateManager as any).calculatePerformanceScore(2, 0);
    expect(score1).toBeGreaterThan(score2);
  });
});
