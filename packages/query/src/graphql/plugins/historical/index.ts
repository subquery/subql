// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {PgBlockHeightPlugin} from './PgBlockHeightPlugin';
import PgConnectionArgFilterBackwardRelationsPlugin from './PgConnectionArgFilterBackwardRelationsPlugin';
import PgConnectionArgFilterForwardRelationsPlugin from './PgConnectionArgFilterForwardRelationsPlugin';

const historicalPlugins = [
  PgBlockHeightPlugin, // This must be before the other plugins to ensure the context is set
  PgConnectionArgFilterBackwardRelationsPlugin,
  PgConnectionArgFilterForwardRelationsPlugin,
];

export default historicalPlugins;
