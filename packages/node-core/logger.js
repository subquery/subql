// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

// A standalone entrypoint for logger so we can import `@subql/node-core/logger`
const logger = require('./dist/logger');

module.exports = logger;
