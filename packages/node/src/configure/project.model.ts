// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { RegistryTypes } from '@polkadot/types/types';
import {
  loadProjectManifest,
  ProjectManifest,
  SubqlDataSource,
} from '@subql/common';
import { prepareProjectDir } from '../utils/project';

export class SubqueryProject implements ProjectManifest {
  static async create(path: string): Promise<SubqueryProject> {
    const projectPath = await prepareProjectDir(path);
    const project = new SubqueryProject();
    const source = loadProjectManifest(projectPath);
    Object.assign(project, source);
    project.path = projectPath;
    return project;
  }

  path: string;

  dataSources: SubqlDataSource[];
  description: string;
  network: {
    endpoint: string;
    customTypes?: RegistryTypes;
  };
  repository: string;
  schema: string;
  specVersion: string;
}
