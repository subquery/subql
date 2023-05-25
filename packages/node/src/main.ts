// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { yargsOptions } from './yargs';

const { argv } = yargsOptions;

// Lazy import, to allow logger in yargsOptions to be initialised before setProfiler()
const { setProfiler } = require('@subql/node-core');
setProfiler(argv.profiler);
