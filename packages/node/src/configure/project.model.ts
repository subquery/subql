// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {
  loadProjectManifest,
  SubqlDataSource,
  ProjectNetworkConfig,
  ProjectManifestVersioned,
} from '@subql/common';
import { getLogger } from '../utils/logger';
import { prepareProjectDir } from '../utils/project';

const logger = getLogger('configure');

export class SubqueryProject {
  private _path: string;
  private _projectManifest: ProjectManifestVersioned;

  static async create(path: string): Promise<SubqueryProject> {
    const projectPath = await prepareProjectDir(path);
    const projectManifest = loadProjectManifest(projectPath);
    return new SubqueryProject(projectManifest, projectPath);
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

  constructor(manifest: ProjectManifestVersioned, path: string) {
    this._projectManifest = manifest;
    this._path = path;

    manifest.dataSources.forEach(function (dataSource) {
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
    if (this._projectManifest.isV0_0_1) {
      return this._projectManifest.asV0_0_1.network;
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
}
