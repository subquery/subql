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
  skipBlock?: boolean;
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

function applyArgs(
  argvs: ArgvOverrideOptions,
  options: RunnerNodeOptionsModel,
  key: keyof Omit<ArgvOverrideOptions, 'disableHistorical'>
) {
  if (argvs[key] === undefined && options[key] !== undefined) {
    argvs[key] = options[key];
  }
}

export function rebaseArgsWithManifest(argvs: ArgvOverrideOptions, rawManifest: unknown): void {
  const options = plainToClass(RunnerNodeOptionsModel, (rawManifest as any)?.runner?.node?.options);
  if (!options) {
    return;
  }

  // we override them if they are not provided in args/flag
  if (argvs.disableHistorical === undefined && options.historical !== undefined) {
    // THIS IS OPPOSITE
    argvs.disableHistorical = !options.historical;
  }
  applyArgs(argvs, options, 'unsafe');
  applyArgs(argvs, options, 'unfinalizedBlocks');
  applyArgs(argvs, options, 'skipBlock');
}
