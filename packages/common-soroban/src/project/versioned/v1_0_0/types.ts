// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {ProjectManifestV1_0_0, TemplateBase} from '@subql/common';
import {SubqlCustomDatasource, SubqlRuntimeDatasource} from '@subql/types-soroban';

export interface RuntimeDatasourceTemplate extends Omit<SubqlRuntimeDatasource, 'name'>, TemplateBase {}
export interface CustomDatasourceTemplate extends Omit<SubqlCustomDatasource, 'name'>, TemplateBase {}

export type SorobanProjectManifestV1_0_0 = ProjectManifestV1_0_0<
  RuntimeDatasourceTemplate | CustomDatasourceTemplate,
  SubqlRuntimeDatasource | SubqlCustomDatasource
>;
