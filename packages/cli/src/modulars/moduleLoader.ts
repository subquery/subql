// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {existsSync} from 'fs';
import path from 'path';
import {NETWORK_FAMILY} from '@subql/common';
import {networkPackages} from './config';
import {ModuleCache} from './types';

const moduleCache: Partial<ModuleCache> = {};

export function loadDependency<N extends NETWORK_FAMILY>(network: N): ModuleCache[N] {
  const packageName = networkPackages[network];
  if (!packageName) {
    throw new Error(`Unknown network: ${network}`);
  }
  if (!moduleCache[network]) {
    try {
      moduleCache[network] = require(packageName) as ModuleCache[N];
    } catch (error) {
      console.warn(`! Failed to load ${packageName} locally: ${error}, attempting to load globally`);
      try {
        const globalNodePath = process.env.NODE_PATH;
        if (!globalNodePath) {
          throw new Error(
            'Global node modules path not set, please try to set environment variable NODE_PATH follow this document: https://nodejs.org/api/modules.html#loading-from-the-global-folders'
          );
        }
        const globalModulePath = path.join(globalNodePath, packageName);
        if (existsSync(globalModulePath)) {
          moduleCache[network] = require(globalModulePath) as ModuleCache[N];
        } else {
          throw new Error(`Global module ${packageName} not found, please run "npm i -g ${packageName}" and retry`);
        }
      } catch (globalError) {
        throw new Error(`! Failed to load dependency globally: ${packageName}`, {cause: globalError});
      }
    }
  }
  return moduleCache[network];
}
