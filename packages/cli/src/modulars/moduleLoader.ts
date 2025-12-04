// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {existsSync} from 'fs';
import path from 'path';
import {NETWORK_FAMILY} from '@subql/common';
import resolveFrom from 'resolve-from';
import {networkPackages} from './config';
import {ModuleCache} from './types';

const moduleCache: Partial<ModuleCache> = {};

export function loadDependency<N extends NETWORK_FAMILY>(network: N, projectDir: string): ModuleCache[N] {
  const packageName = networkPackages[network];
  if (!packageName) {
    throw new Error(`Unknown network: ${network}`);
  }
  if (!moduleCache[network]) {
    try {
      // Resolve the package from the project directory, otherwise look relative to the current package
      // We don't do this in tests because it will resolve mixed versions because dev dependenceies
      const projectDep =
        process.env.NODE_ENV === 'test' ? undefined : resolveFrom.silent(projectDir ?? process.cwd(), packageName);
      moduleCache[network] = require(projectDep ?? packageName) as ModuleCache[N];
    } catch (error) {
      console.warn(`! Failed to load ${packageName} locally: ${error}. \n ! Attempting to load globally`);
      try {
        const globalNodePath = process.env.NODE_PATH;
        if (!globalNodePath) {
          throw new Error(
            `If you have installed ${packageName} globally please set the NODE_PATH environment variable. Follow this document for more details: https://nodejs.org/api/modules.html#loading-from-the-global-folders`
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
  // Check dependencies actually satisfy INetworkCommonModule
  const loadedModule = moduleCache[network];
  if (
    loadedModule?.parseProjectManifest === undefined ||
    loadedModule?.isCustomDs === undefined ||
    loadedModule?.isRuntimeDs === undefined
  ) {
    throw new Error(`${packageName} is not compatible, please make sure package update to latest version`);
  }
  return loadedModule;
}
