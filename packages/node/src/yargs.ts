// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { yargsBuilder } from '@subql/node-core/yargs';

export const yargsOptions = yargsBuilder({
  initTesting: () => {
    // lazy import to make sure logger is instantiated before all other services
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { testingInit } = require('./subcommands/testing.init');
    return testingInit();
  },
  initForceClean: () => {
    // lazy import to make sure logger is instantiated before all other services
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { forceCleanInit } = require('./subcommands/forceClean.init');
    return forceCleanInit();
  },
  initReindex: (targetHeight: number) => {
    // lazy import to make sure logger is instantiated before all other services
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { reindexInit } = require('./subcommands/reindex.init');
    return reindexInit(targetHeight);
  },
  runOptions: {
    'block-confirmations': {
      demandOption: false,
      default: 200,
      describe:
        'The number of blocks behind the head to be considered finalized for networks without deterministic finalisation such as Polygon POS',
      type: 'number',
    },
    'block-fork-reindex': {
      demandOption: false,
      default: 1000,
      type: 'number',
      describe:
        'The number of blocks to reindex if a fork happens before cached unfinalized blocks and POI is not enabled.',
    },
    'query-address-limit': {
      describe:
        'Set the limit for address on dictionary queries for dynamic datasources',
      type: 'number',
      default: 100,
    },
  },
});
