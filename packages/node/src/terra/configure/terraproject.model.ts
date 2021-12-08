// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';

import {
  SubqlTerraDatasource,
  TerraProjectManifest,
  TerraNetwork,
} from '../indexer/terraproject';
import { loadTerraProjectManifest } from '../indexer/utils';
import { getLogger } from '../utils/logger';
import { prepareProjectDir } from '../utils/project';

const logger = getLogger('configure');

export class SubqueryTerraProject {
  private _path: string;
  private _projectManifest: TerraProjectManifest;

  static async create(path: string): Promise<SubqueryTerraProject> {
    const projectPath = await prepareProjectDir(path);
    const projectManifest = loadTerraProjectManifest(projectPath);
    return new SubqueryTerraProject(projectManifest, projectPath);
  }

  constructor(manifest: TerraProjectManifest, path: string) {
    this._projectManifest = manifest;
    this._path = path;

    manifest.dataSources?.forEach(function (dataSource) {
      if (!dataSource.startBlock || dataSource.startBlock < 1) {
        if (dataSource.startBlock < 1) logger.warn('start block changed to #1');
        dataSource.startBlock = 1;
      }
    });
  }

  get projectManifest(): TerraProjectManifest {
    return this._projectManifest;
  }

  //TODO: do manifest versioning. Define network type
  get network(): TerraNetwork {
    const network = this._projectManifest.network;

    if (!network.endpoint) {
      throw new Error(
        `Network endpoint must be provided for network. genesisHash="${network.genesisHash}"`,
      );
    }

    if (!network.chainId) {
      throw new Error(
        `Network chain ID must be provided for networl. genesisHas="${network.genesisHash}"`,
      );
    }

    return network;
  }

  get path(): string {
    return this._path;
  }
  get dataSources(): SubqlTerraDatasource[] {
    return this._projectManifest.dataSources;
  }
  get schema(): string {
    return this._projectManifest.schema;
  }
}
