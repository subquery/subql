// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {DatasourceParams} from '../../dynamic-ds.service';
import {MetadataKeys} from '../../entities';

export type MetadataKey = keyof MetadataKeys;
export const incrementKeys: MetadataKey[] = ['processedBlockCount', 'schemaMigrationCount'];
export type IncrementalMetadataKey = 'processedBlockCount' | 'schemaMigrationCount';

export const METADATA_ENTITY_NAME = '_metadata';

type SchemaTable = string | {tableName: string; schema: string; delimiter: string};

export function INCREMENT_QUERY(schemaTable: SchemaTable, key: MetadataKey, amount = 1): string {
  return `INSERT INTO ${schemaTable} (key, value, "createdAt", "updatedAt")
  VALUES ('${key}', '0'::jsonb, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT (key) DO
  UPDATE SET value = (COALESCE(${schemaTable}.value->>0)::int + '${amount}')::text::jsonb,
    "updatedAt" = CURRENT_TIMESTAMP
  WHERE ${schemaTable}.key = '${key}';`;
}

export function APPEND_DS_QUERY(schemaTable: SchemaTable, items: DatasourceParams[]): string {
  const VALUE = '"value"';

  const makeSet = (item: DatasourceParams, value: string, index = 1): string =>
    `jsonb_set(${value}, array[(jsonb_array_length(${VALUE}) + ${index})::text], '${JSON.stringify(
      item
    )}'::jsonb, true)`;

  return `
      UPDATE ${schemaTable}
      SET ${VALUE} = ${items.reduce((acc, item, index) => makeSet(item, acc, index + 1), VALUE)},
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE ${schemaTable}.key = 'dynamicDatasources';
    `;
}
