// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {ProjectManifestV1_0_0, TemplateBase} from '@subql/common';
import {SubstrateCustomDatasource, SubstrateRuntimeDatasource} from '@subql/types';

export interface RuntimeDatasourceTemplate extends Omit<SubstrateRuntimeDatasource, 'name'>, TemplateBase {}
export interface CustomDatasourceTemplate extends Omit<SubstrateCustomDatasource, 'name'>, TemplateBase {}

export type SubstrateProjectManifestV1_0_0 = ProjectManifestV1_0_0<
  RuntimeDatasourceTemplate | CustomDatasourceTemplate,
  SubstrateRuntimeDatasource | SubstrateCustomDatasource
>;
