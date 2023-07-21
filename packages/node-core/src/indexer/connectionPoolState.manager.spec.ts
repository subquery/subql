// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {ConnectionPoolStateManager} from './connectionPoolState.manager';

describe('ConnectionPoolStateManager', function () {
  let connectionPoolStateManager: ConnectionPoolStateManager<any>;

  beforeEach(function () {
    connectionPoolStateManager = new ConnectionPoolStateManager();
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
