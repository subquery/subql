// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { ProjectManifest, SubqlDataSource } from '@subql/common';

export class SubqueryProject implements ProjectManifest {
  static create(source: ProjectManifest, path: string): SubqueryProject {
    const project = new SubqueryProject();
    Object.assign(project, source);
    project.path = path;
    return project;
  }

  path: string;

  dataSources: SubqlDataSource[];
  description: string;
  endpoint: string;
  repository: string;
  schema: string;
  specVersion: string;
}
