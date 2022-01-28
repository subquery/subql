// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {
  loadProjectManifest,
  ProjectManifestVersioned,
  TerraProjectNetworkConfig,
} from '@subql/common';
import { ProjectNetworkV0_3_0 } from '@subql/common/project/versioned/v0_3_0';
import { SubqlTerraDatasource } from '@subql/types';
import { loadTerraProjectManifest } from '../indexer/utils';
import { getLogger } from '../utils/logger';
import { prepareProjectDir } from '../utils/project';

const logger = getLogger('configure');

export class SubqueryTerraProject {
  private _path: string;
  private _projectManifest: ProjectManifestVersioned;

  static async create(path: string): Promise<SubqueryTerraProject> {
    const projectPath = await prepareProjectDir(path);
    const projectManifest = loadProjectManifest(projectPath);
    return new SubqueryTerraProject(projectManifest, projectPath);
  }

  constructor(manifest: ProjectManifestVersioned, path: string) {
    this._projectManifest = manifest;
    this._path = path;

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

  //TODO: do manifest versioning. Define network type
  get network(): TerraProjectNetworkConfig {
    const impl = this._projectManifest.asImpl;
    const network = {
      ...(impl.network as ProjectNetworkV0_3_0),
    };

    if (!network.endpoint) {
      throw new Error(
        `Network endpoint must be provided for network. chainId="${network.chainId}"`,
      );
    }

    return network;
  }

  get path(): string {
    return this._path;
  }
  get dataSources(): SubqlTerraDatasource[] {
    return this._projectManifest.dataSources as SubqlTerraDatasource[];
  }
  get schema(): string {
    return this._projectManifest.schema;
  }
}
