// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {QueryTypes, Sequelize} from 'sequelize';
import {NodeConfig} from '../configure/NodeConfig';
import {Metadata, MetadataRepo} from '../indexer/entities/Metadata.entity';
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

export async function getMetaDataInfo<T extends Metadata['value'] = number>(
  metadataRepo: MetadataRepo,
  key: Metadata['key']
): Promise<T | undefined> {
  const res = await metadataRepo.findOne({
    where: {key: key},
  });
  return res?.value as T | undefined;
}

export function bypassBlocksValidator(bypassBlocks: number[], currentBlockBatch: number[]): number[][] {
  const processedBatchBlocks = currentBlockBatch.filter((block) => !bypassBlocks.includes(block));
  const processedBypassBlocks = bypassBlocks.filter((block) => !currentBlockBatch.includes(block));
  return [processedBypassBlocks, processedBatchBlocks];
}
