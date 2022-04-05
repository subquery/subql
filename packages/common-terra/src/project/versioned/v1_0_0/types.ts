// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {ProjectManifestV1_0_0} from '@subql/common';
import {RuntimeDataSourceV0_3_0, CustomDatasourceV0_3_0} from '../v0_3_0';

export type TerraProjectManifestV1_0_0 = ProjectManifestV1_0_0<never, RuntimeDataSourceV0_3_0 | CustomDatasourceV0_3_0>;
