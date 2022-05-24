// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {PgEntity, PgEntityKind} from 'graphile-build-pg';
import {makePgSmartTagsPlugin} from 'graphile-utils';

export const smartTagsPlugin = makePgSmartTagsPlugin([
  {
    //Rule 1, omit `_metadata` from node
    kind: PgEntityKind.CLASS,
    match: ({name}: PgEntity) => /^_metadata$/.test(name),
    tags: {
      omit: true,
    },
  },
  // Omit _block_range column
  {
    kind: PgEntityKind.ATTRIBUTE,
    match: ({name}) => /^_block_range$/.test(name),
    tags: {
      omit: true,
    },
  },
  // Omit _id column
  {
    kind: PgEntityKind.ATTRIBUTE,
    match: ({name}) => /^_id$/.test(name),
    tags: {
      omit: true,
    },
  },
]);
