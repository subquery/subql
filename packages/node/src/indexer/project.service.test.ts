// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { initLogger } from '@subql/node-core/logger';

import { yargsOptions } from '../yargs';

const { argv } = yargsOptions;

initLogger(
  argv.debug,
  argv.outputFormat as 'json' | 'colored',
  argv.logLevel as string | undefined,
);

describe('ProjectService Integration Tests', () => {
  const { projectServiceTest } = require('./project.service.test.init.js');
  projectServiceTest();
});
