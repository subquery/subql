// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {BaseDataSource} from '../base';
import {ProjectManifestV0_2_1, TemplateBase} from '../v0_2_1';
import {RuntimeDataSourceV0_3_0, CustomDatasourceV0_3_0} from '../v0_3_0';

export interface RuntimeDatasourceTemplate extends Omit<RuntimeDataSourceV0_3_0, 'name'>, TemplateBase {}
export interface CustomDatasourceTemplate extends Omit<CustomDatasourceV0_3_0, 'name'>, TemplateBase {}

export type CosmosProjectManifestV1_0_0 = ProjectManifestV1_0_0<
  RuntimeDatasourceTemplate | CustomDatasourceTemplate,
  RuntimeDataSourceV0_3_0 | CustomDatasourceV0_3_0
>;

// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

export interface RunnerSpecs {
  node: NodeSpec;
  query: QuerySpec;
}

export interface NodeSpec {
  name: string;
  version: string;
}

export interface QuerySpec {
  name: string;
  version: string;
}

export interface ProjectManifestV1_0_0<T extends object = TemplateBase, D extends object = BaseDataSource>
  extends Omit<ProjectManifestV0_2_1<T, D>, 'network'> {
  dataSources: D[];
  runner: RunnerSpecs;
  templates?: T[];
  network: {
    chainId: string;
    endpoint?: string;
    dictionary?: string;
  };
}
