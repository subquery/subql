// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {filter, intersection, isEqual, isNumber, range, remove, without} from 'lodash';
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

interface bypassBlockValidatorType {
  processedBypassBlocks: number[];
  processedBatchBlocks: number[];
}

export function transformBypassBlocks(bypassBlocks: (number | string)[]): number[] {
  // if no more bypass, just return []
  if (!bypassBlocks?.length) return [];

  return [].concat(
    ...bypassBlocks.map((bypassEntry) => {
      if (isNumber(bypassEntry)) return bypassEntry;
      const splitRange = bypassEntry.split('-').map((val) => parseInt(val.trim(), 10));
      return range(splitRange[0], splitRange[1] + 1);
    })
  );
}

export function cleanedBatchBlocks(bypassBlocks: number[], currentBlockBatch: number[]): number[] {
  // if contains range, then transform it
  const _processedBypassBlocks = transformBypassBlocks(bypassBlocks);

  // new blockBatch after filtering out all the bypass
  const cleanBlockBatch = without(currentBlockBatch, ..._processedBypassBlocks);

  console.log('cleaned batch', cleanBlockBatch);
  return cleanBlockBatch;
}

// new bypassBatch after fitlering out all the commons with currentBatch
// I think this may be the root of the issue
// const cleanBypassBatch = filter(bypassBlocks, intersection(bypassBlocks, currentBlockBatch))

// this is returning the removeblocks from currentBatch
// const removedBlocks = filter(currentBlockBatch, (el) => bypassBlocks.indexOf(el) >= 0)

// process bypass, remove all common, and should remove all that is less than the max of currentBatch
// const processedBypassBlocks = _processedBypassBlocks.filter((block) => !currentBlockBatch.includes(block) || block > Math.max(...currentBlockBatch));
