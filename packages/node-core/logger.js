// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

// A standalone entrypoint for logger so we can import `@subql/node-core/logger`
const logger = require('./dist/logger');

module.exports = logger;
