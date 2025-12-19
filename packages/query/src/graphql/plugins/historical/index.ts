// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {PgBlockHeightPlugin} from './PgBlockHeightPlugin';
import {PgBlockRangePlugin} from './PgBlockRangePlugin';
import {PgBlockRangeTransformPlugin} from './PgBlockRangeTransformPlugin';
import PgConnectionArgFilterBackwardRelationsPlugin from './PgConnectionArgFilterBackwardRelationsPlugin';
import PgConnectionArgFilterForwardRelationsPlugin from './PgConnectionArgFilterForwardRelationsPlugin';

const historicalPlugins = [
  PgBlockHeightPlugin, // This must be before the other plugins to ensure the context is set
  PgBlockRangePlugin,
  PgConnectionArgFilterBackwardRelationsPlugin,
  PgConnectionArgFilterForwardRelationsPlugin,
  PgBlockRangeTransformPlugin,
];

export default historicalPlugins;
