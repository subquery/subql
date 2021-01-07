// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import path from 'path';
import os from 'os';
import tar from 'tar';
import {
  loadProjectManifest,
  ProjectManifest,
  SubqlDataSource,
} from '@subql/common';

export class SubqueryProject implements ProjectManifest {
  static async processPath(projectPath: string): Promise<string> {
    const stats = fs.statSync(projectPath);
    if (stats.isFile()) {
      try {
        const sep = path.basename(projectPath);
        const tmpDir = os.tmpdir();
        const tempPath = fs.mkdtempSync(`${tmpDir}${sep}`);
        await tar.x({ file: projectPath, cwd: tempPath });
        return tempPath.concat('/package');
      } catch (err) {
        console.error(err.message);
        process.exit(1);
      }
    } else if (stats.isDirectory()) {
      return projectPath;
    }
  }

  static async create(path: string): Promise<SubqueryProject> {
    const projectPath = await this.processPath(path);
    const project = new SubqueryProject();
    const source = loadProjectManifest(projectPath);
    Object.assign(project, source);
    project.path = projectPath;
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
