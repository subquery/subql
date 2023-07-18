// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {MULTI_METADATA_REGEX, METADATA_REGEX} from '@subql/utils';
import {PgEntity, PgEntityKind} from '@subql/x-graphile-build-pg';
import {makePgSmartTagsPlugin} from 'graphile-utils';

export const smartTagsPlugin = makePgSmartTagsPlugin([
  {
    //Rule 1, omit `_metadata` from node
    kind: PgEntityKind.CLASS,
    match: ({name}: PgEntity) => METADATA_REGEX.test(name) || MULTI_METADATA_REGEX.test(name),
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
