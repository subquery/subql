// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import {getProjectRootAndManifest, IPFS_REGEX, RunnerNodeOptionsModel} from '@subql/common';
import {plainToClass} from 'class-transformer';
import {last} from 'lodash';
import {IConfig, MinConfig} from '../configure/NodeConfig';

// These are overridable types from node argv
export interface ArgvOverrideOptions {
  unsafe?: boolean;
  disableHistorical?: boolean;
  unfinalizedBlocks?: boolean;
}

export function defaultSubqueryName(config: Partial<IConfig>): MinConfig {
  if (config.subquery === undefined) {
    throw new Error(`Must provide local path or IPFS cid of the subquery project`);
  }
  const ipfsMatch = config.subquery.match(IPFS_REGEX);
  return {
    ...config,
    subqueryName:
      config.subqueryName ??
      (ipfsMatch
        ? config.subquery.replace(IPFS_REGEX, '')
        : last(getProjectRootAndManifest(config.subquery).root.split(path.sep))),
  } as MinConfig;
}

export function rebaseArgsWithManifest(argvs: ArgvOverrideOptions, rawManifest: unknown): void {
  const options = plainToClass(RunnerNodeOptionsModel, (rawManifest as any)?.runner?.node?.options);
  if (!options) {
    return;
  }
  // we override them if they are not provided in args/flag
  if (argvs.unsafe === undefined && options.unsafe !== undefined) {
    argvs.unsafe = options.unsafe;
  }
  if (argvs.disableHistorical === undefined && options.historical !== undefined) {
    // THIS IS OPPOSITE
    argvs.disableHistorical = !options.historical;
  }
  if (argvs.unfinalizedBlocks === undefined && options.unfinalizedBlocks !== undefined) {
    argvs.unfinalizedBlocks = options.unfinalizedBlocks;
  }
}
