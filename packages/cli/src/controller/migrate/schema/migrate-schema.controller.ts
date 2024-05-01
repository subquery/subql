// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'fs';

export async function migrateSchema(subgraphSchemaPath: string, subqlSchemaPath: string) {
  await fs.promises.rm(subqlSchemaPath, {force: true});
  // copy over schema
  fs.copyFileSync(subgraphSchemaPath, subqlSchemaPath);
  console.log(
    `* schema.graphql have been copied over, they will need to be updated to work with SubQuery. See our documentation for more details https://academy.subquery.network/build/graphql.html`
  );
}
