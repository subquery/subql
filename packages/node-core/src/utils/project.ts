// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {isNumber, range, uniq, without} from 'lodash';
import {QueryTypes, Sequelize} from 'sequelize';
import {NodeConfig} from '../configure/NodeConfig';
import {getLogger} from '../logger';

const logger = getLogger('Project-Utils');

export async function getExistingProjectSchema(
  nodeConfig: NodeConfig,
  sequelize: Sequelize
): Promise<string | undefined> {
  const DEFAULT_DB_SCHEMA = 'public';
  const schema = nodeConfig.localMode ? DEFAULT_DB_SCHEMA : nodeConfig.dbSchema;

  let schemas: string[];
  try {
    const result = await sequelize.query(`SELECT schema_name FROM information_schema.schemata`, {
      type: QueryTypes.SELECT,
    });
    schemas = result.map((x: any) => x.schema_name);
  } catch (err) {
    logger.error(`Unable to fetch all schemas: ${err}`);
    process.exit(1);
  }
  if (!schemas.includes(schema)) {
    return undefined;
  }
  return schema;
}

export function transformBypassBlocks(bypassBlocks: (number | string)[]): number[] {
  if (!bypassBlocks?.length) return [];

  return uniq(
    [].concat(
      ...bypassBlocks.map((bypassEntry) => {
        if (isNumber(bypassEntry)) return bypassEntry;
        const splitRange = bypassEntry.split('-').map((val) => parseInt(val.trim(), 10));
        return range(splitRange[0], splitRange[1] + 1);
      })
    )
  );
}

export function cleanedBatchBlocks(bypassBlocks: number[], currentBlockBatch: number[]): number[] {
  return without(currentBlockBatch, ...transformBypassBlocks(bypassBlocks));
}

export async function getEnumDeprecated(sequelize: Sequelize, enumTypeNameDeprecated: string): Promise<unknown[]> {
  const [resultsDeprecated] = await sequelize.query(
    `select e.enumlabel as enum_value
         from pg_type t
         join pg_enum e on t.oid = e.enumtypid
         where t.typname = ?
         order by enumsortorder;`,
    {replacements: [enumTypeNameDeprecated]}
  );
  return resultsDeprecated;
}
