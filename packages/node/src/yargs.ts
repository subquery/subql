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

  rootOptions: {
    'soroban-network-endpoint': {
      demandOption: false,
      type: 'string',
      describe: 'Blockchain network endpoint to connect',
    },
  },
});
