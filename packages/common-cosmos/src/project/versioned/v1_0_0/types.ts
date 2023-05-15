// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {ProjectManifestV1_0_0, TemplateBase} from '@subql/common';
import {SubqlCosmosCustomDatasource, SubqlCosmosRuntimeDatasource} from '@subql/types-cosmos';

export interface RuntimeDatasourceTemplate extends Omit<SubqlCosmosRuntimeDatasource, 'name'>, TemplateBase {}
export interface CustomDatasourceTemplate extends Omit<SubqlCosmosCustomDatasource, 'name'>, TemplateBase {}

export type CosmosProjectManifestV1_0_0 = ProjectManifestV1_0_0<
  RuntimeDatasourceTemplate | CustomDatasourceTemplate,
  SubqlCosmosRuntimeDatasource | SubqlCosmosCustomDatasource
>;
