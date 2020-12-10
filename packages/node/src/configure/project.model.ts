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
