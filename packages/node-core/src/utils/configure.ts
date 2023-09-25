// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

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
  skipTransactions?: boolean;
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

  // Do this with any options as other SDKs might want to implement custom options
  (Object.entries(options) as [keyof Omit<ArgvOverrideOptions, 'disableHistorical'> | 'historical', any][]).map(
    ([key, value]) => {
      // we override them if they are not provided in args/flag
      if (key === 'historical') {
        if (value !== undefined) {
          // THIS IS OPPOSITE
          argvs.disableHistorical = !value;
        }
        return;
      }
      if (value !== undefined && argvs[key] === undefined) {
        argvs[key] = value;
      }
    }
  );
}
