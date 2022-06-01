// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {ProjectManifestV1_0_0} from '@subql/common';
import {CustomDatasourceV0_2_0, RuntimeDataSourceV0_2_0} from '../v0_2_0';
import {RuntimeDatasourceTemplate, CustomDatasourceTemplate} from '../v0_2_1';

export type CosmosProjectManifestV1_0_0 = ProjectManifestV1_0_0<
  RuntimeDatasourceTemplate | CustomDatasourceTemplate,
  RuntimeDataSourceV0_2_0 | CustomDatasourceV0_2_0
>;
