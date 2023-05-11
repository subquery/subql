// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {ProjectManifestV1_0_0, TemplateBase} from '@subql/common';
import {SubqlCustomDatasource, SubqlRuntimeDatasource} from '@subql/types-ethereum';

export interface RuntimeDatasourceTemplate extends Omit<SubqlRuntimeDatasource, 'name'>, TemplateBase {}
export interface CustomDatasourceTemplate extends Omit<SubqlCustomDatasource, 'name'>, TemplateBase {}

export type EthereumProjectManifestV1_0_0 = ProjectManifestV1_0_0<
  RuntimeDatasourceTemplate | CustomDatasourceTemplate,
  SubqlRuntimeDatasource | SubqlCustomDatasource
>;
