import {SubqlKind} from './constants';

export interface ProjectManifest {
  specVersion: string;
  description: string;
  repository: string;

  schema: string;

  endpoint: string;

  dataSources: SubqlDataSource[];
}

export interface SubqlBlockFilter {
  module?: string;
}

export interface SubqlBlockHandler {
  handler: string;
  kind: 'substrate/BlockHandler';
  filter: SubqlBlockFilter;
}

// export interface SubqlCallHandler {}
//
// export interface SubqlEventHandler {}

export interface SubqlMapping {
  handlers: SubqlBlockHandler[];
}

export interface SubqlDatasource {
  name: string;
  kind: SubqlKind;
  startBlock: number;
  mapping: SubqlMapping;
}

export interface SubqlRuntimeDatasource extends SubqlDatasource {
  kind: SubqlKind.Runtime;
}

export type SubqlDataSource = SubqlRuntimeDatasource;
