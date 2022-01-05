// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import { RegisteredTypes } from '@polkadot/types/types';
import {
  loadProjectManifest,
  parseChainTypes,
  ProjectNetworkConfig,
  ProjectManifestVersioned,
  manifestIsV0_0_1,
  manifestIsV0_2_0,
  loadChainTypes,
  ChainTypes,
} from '@subql/common';
import { SubqlDatasource } from '@subql/types';
import chalk from 'chalk';
import { pick } from 'lodash';
import { getLogger } from '../utils/logger';
import { prepareProjectDir } from '../utils/project';

const logger = getLogger('configure');

export class SubqueryProject {
  private _path: string;
  private _projectManifest: ProjectManifestVersioned;

  static async create(
    path: string,
    networkOverrides?: Partial<ProjectNetworkConfig>,
  ): Promise<SubqueryProject> {
    const projectPath = await prepareProjectDir(path);
    const projectManifest = loadProjectManifest(projectPath);
    return new SubqueryProject(projectManifest, projectPath, networkOverrides);
  }

  constructor(
    manifest: ProjectManifestVersioned,
    path: string,
    private networkOverrides?: Partial<ProjectNetworkConfig>,
  ) {
    this._projectManifest = manifest;
    this._path = path;

    if (manifestIsV0_0_1(manifest)) {
      logger.warn(
        `Running project with deprecated specVersion v0.0.1, in the future this project will be denied from being uploaded to the subquery hosted service. Consider migrating your project by running ${chalk.blue(
          'subql migrate',
        )}`,
      );
    }

    manifest.dataSources?.forEach(function (dataSource) {
      if (!dataSource.startBlock || dataSource.startBlock < 1) {
        if (dataSource.startBlock < 1) logger.warn('Start block changed to #1');
        dataSource.startBlock = 1;
      }
    });
  }

  get projectManifest(): ProjectManifestVersioned {
    return this._projectManifest;
  }

  get network(): Partial<ProjectNetworkConfig> {
    const impl = this._projectManifest.asImpl;

    if (manifestIsV0_0_1(impl)) {
      return {
        ...impl.network,
        ...this.networkOverrides,
      };
    }

    if (manifestIsV0_2_0(impl)) {
      const network = {
        ...impl.network,
        ...this.networkOverrides,
      };

      if (!network.endpoint) {
        throw new Error(
          `Network endpoint must be provided for network. genesisHash="${network.genesisHash}"`,
        );
      }

      return network;
    }

    throw new Error(
      `unsupported specVersion: ${this._projectManifest.specVersion}`,
    );
  }

  get path(): string {
    return this._path;
  }
  get dataSources(): SubqlDatasource[] {
    return this._projectManifest.dataSources;
  }
  get schema(): string {
    return this._projectManifest.schema;
  }

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

    if (manifestIsV0_2_0(impl)) {
      if (!impl.network.chaintypes) {
        return;
      }

      let rawChainTypes: unknown;
      let parsedChainTypes: ChainTypes;
      try {
        rawChainTypes = loadChainTypes(
          path.join(this._path, impl.network.chaintypes.file),
          this.path,
        );
        parsedChainTypes = parseChainTypes(rawChainTypes);
      } catch (e) {
        logger.error(`Failed to load chaintypes file, ${e}`);
        process.exit(1);
      }
      return parsedChainTypes;
    }
  }
}
