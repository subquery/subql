// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {ProjectManifestV0_2_1, TemplateBase} from '@subql/common';
import {CustomDatasourceV0_2_0, RuntimeDataSourceV0_2_0} from '../v0_2_0';

// export interface DatasourceTemplate {
//   name: string;
// }

export interface RuntimeDatasourceTemplate extends Omit<RuntimeDataSourceV0_2_0, 'name'>, TemplateBase {}
export interface CustomDatasourceTemplate extends Omit<CustomDatasourceV0_2_0, 'name'>, TemplateBase {}

export type CosmosProjectManifestV0_2_1 = ProjectManifestV0_2_1<
  RuntimeDatasourceTemplate | CustomDatasourceTemplate,
  RuntimeDataSourceV0_2_0 | CustomDatasourceV0_2_0
>;
