// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {NETWORK_FAMILY, runnerMapping} from '@subql/common';

export const networkPackages = Object.entries(runnerMapping).reduce(
  (acc, [runner, family]) => {
    // Special case because substrate has 2 runners
    if (runner === '@subql/node' && family === NETWORK_FAMILY.substrate) {
      acc[family] = '@subql/common-substrate';
      return acc;
    }
    acc[family] = runner.replace('@subql/node-', '@subql/common-');
    return acc;
  },
  {} as Record<NETWORK_FAMILY, string>
);
