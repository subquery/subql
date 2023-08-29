// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {ConnectionPoolStateManager} from './connectionPoolState.manager';

describe('ConnectionPoolStateManager', function () {
  let connectionPoolStateManager: ConnectionPoolStateManager<any>;
  const EXAMPLE_ENDPOINT1 = 'http://example1.com';
  const EXAMPLE_ENDPOINT2 = 'http://example2.com';

  beforeEach(function () {
    connectionPoolStateManager = new ConnectionPoolStateManager();
  });

  it('chooses primary endpoint first', async function () {
    (connectionPoolStateManager as any).pool[EXAMPLE_ENDPOINT1] = {
      primary: true,
      performanceScore: 100,
      failureCount: 0,
      endpoint: '',
      backoffDelay: 0,
      rateLimited: false,
      failed: false,
      connected: true,
      lastRequestTime: 0,
    };

    (connectionPoolStateManager as any).pool[EXAMPLE_ENDPOINT2] = {
      primary: false,
      performanceScore: 100,
      failureCount: 0,
      endpoint: '',
      backoffDelay: 0,
      rateLimited: false,
      failed: false,
      connected: true,
      lastRequestTime: 0,
    };

    expect(await connectionPoolStateManager.getNextConnectedEndpoint()).toEqual(EXAMPLE_ENDPOINT1);
  });

  it('does not choose primary endpoint if failed', async function () {
    (connectionPoolStateManager as any).pool[EXAMPLE_ENDPOINT1] = {
      primary: true,
      performanceScore: 100,
      failureCount: 0,
      endpoint: '',
      backoffDelay: 0,
      rateLimited: false,
      failed: false,
      connected: false,
      lastRequestTime: 0,
    };

    (connectionPoolStateManager as any).pool[EXAMPLE_ENDPOINT2] = {
      primary: false,
      performanceScore: 100,
      failureCount: 0,
      endpoint: '',
      backoffDelay: 0,
      rateLimited: false,
      failed: false,
      connected: true,
      lastRequestTime: 0,
    };

    expect(await connectionPoolStateManager.getNextConnectedEndpoint()).toEqual(EXAMPLE_ENDPOINT2);
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
