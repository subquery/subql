// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import { RegisteredTypes } from '@polkadot/types/types';
import {
  loadProjectManifest,
  parseChainTypes,
  SubqlDataSource,
  ProjectNetworkConfig,
  ProjectManifestVersioned,
  manifestIsV0_0_1,
  manifestIsV0_0_2,
  loadFromJsonOrYaml,
} from '@subql/common';
import { pick } from 'lodash';
import { getLogger } from '../utils/logger';
import { prepareProjectDir } from '../utils/project';
import { NetworkRegistry } from './NodeConfig';

const logger = getLogger('configure');

export class SubqueryProject {
  private _path: string;
  private _projectManifest: ProjectManifestVersioned;
  private _networkRegistry: NetworkRegistry;

  static async create(
    path: string,
    networkRegistry: NetworkRegistry,
  ): Promise<SubqueryProject> {
    const projectPath = await prepareProjectDir(path);
    const projectManifest = loadProjectManifest(projectPath);
    return new SubqueryProject(projectManifest, projectPath, networkRegistry);
    // Object.assign(project, source);
    // project._path = projectPath;
    // project.dataSources.map(function (dataSource) {
    //   if (!dataSource.startBlock || dataSource.startBlock < 1) {
    //     if (dataSource.startBlock < 1) logger.warn('start block changed to #1');
    //     dataSource.startBlock = 1;
    //   }
    // });
    // return project;
  }

  constructor(
    manifest: ProjectManifestVersioned,
    path: string,
    networkRegistry: NetworkRegistry,
  ) {
    this._projectManifest = manifest;
    this._path = path;
    this._networkRegistry = networkRegistry;

    manifest.dataSources?.forEach(function (dataSource) {
      if (!dataSource.startBlock || dataSource.startBlock < 1) {
        if (dataSource.startBlock < 1) logger.warn('start block changed to #1');
        dataSource.startBlock = 1;
      }
    });
  }

  get projectManifest(): ProjectManifestVersioned {
    return this._projectManifest;
  }

  get network(): ProjectNetworkConfig {
    const impl = this._projectManifest.asImpl;

    if (manifestIsV0_0_1(impl)) {
      return impl.network;
    }

    if (manifestIsV0_0_2(impl)) {
      const genesisHash = impl.network.genesisHash;

      const network = this._networkRegistry[genesisHash];

      if (!network)
        throw new Error(
          `Unable to get network endpoint. genesisHash="${genesisHash}"`,
        );

      return {
        ...network,
        genesisHash,
      };
    }

    throw new Error(
      `unsupported specVersion: ${this._projectManifest.specVersion}`,
    );
  }

  get path(): string {
    return this._path;
  }
  get dataSources(): SubqlDataSource[] {
    return this._projectManifest.dataSources;
  }
  // description: string;
  // repository: string;
  get schema(): string {
    return this._projectManifest.schema;
  }
  // specVersion: string;

  get chainTypes(): RegisteredTypes | undefined {
    const impl = this._projectManifest.asImpl;
    if (manifestIsV0_0_1(impl)) {
      return pick<RegisteredTypes>(impl.network, [
        'types',
        'typesAlias',
        'typesBundle',
        'typesChain',
        'typesSpec',
      ]);
    }

    if (manifestIsV0_0_2(impl)) {
      if (!impl.network.chaintypes) {
        return;
      }

      const rawChainTypes = loadFromJsonOrYaml(
        path.join(this._path, impl.network.chaintypes.file),
      );

      return parseChainTypes(rawChainTypes);
    }
  }
}
