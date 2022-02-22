// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {CustomDatasourceV0_2_0, ProjectManifestV0_2_0, RuntimeDataSourceV0_2_0} from '../v0_2_0';

export interface DatasourceTemplate {
  name: string;
}

export type RuntimeDatasourceTemplate = RuntimeDataSourceV0_2_0 & DatasourceTemplate;
export type CustomDatasourceTemplate = CustomDatasourceV0_2_0 & DatasourceTemplate;

export interface ProjectManifestV0_2_1 extends ProjectManifestV0_2_0 {
  templates?: (RuntimeDatasourceTemplate | CustomDatasourceTemplate)[];
}
