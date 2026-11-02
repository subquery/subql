// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0
//
// PgConnectionArgFilter{Forward,Backward}RelationsPlugin from the
// historical filter pattern are now provided by
// postgraphile-plugin-connection-filter, so no need to register them here.

import {PgBlockHeightPlugin} from './PgBlockHeightPlugin';
import {PgConnectionFilterBlockHeightPlugin} from './PgConnectionFilterBlockHeightPlugin';

const historicalPlugins: GraphileConfig.Plugin[] = [PgBlockHeightPlugin, PgConnectionFilterBlockHeightPlugin];

export default historicalPlugins;
