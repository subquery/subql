// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { camelCase } from 'lodash';

export interface indexField {
  schemaName: string;
  tableName: string;
  entityName: string;
  fieldName: string;
  isUnique: boolean;
  type: string;
}

export async function packEntityFields(
  schema: string,
  entity: string,
): Promise<indexField[]> {
  const model = this.sequelize.model(entity);

  const rows = await this.sequelize.query(
    `select
    n.nspname as schema_name ,
    tab.relname as table_name,
    '${entity}' as entity_name,
    a.attname as field_name,
    idx.indisunique as is_unique,
    am.amname as type
from
    pg_index idx
    JOIN pg_class cls ON cls.oid=idx.indexrelid
    JOIN pg_class tab ON tab.oid=idx.indrelid
    JOIN pg_am am ON am.oid=cls.relam,
    pg_namespace n,
    pg_attribute a
where
  n.nspname = '${schema}'
  and tab.relname = '${model.tableName}'
  and a.attrelid = tab.oid
  and a.attnum = ANY(idx.indkey)
  and not idx.indisprimary
group by
    n.nspname,
    a.attname,
    tab.relname,
    idx.indisunique,
    am.amname`,
  );
  const results = rows[0];
  return results.map((r) => {
    return Object.keys(r).reduce(
      (result, key) => ({
        ...result,
        [camelCase(key)]: r[key],
      }),
      {},
    );
  }) as indexField[];
}
