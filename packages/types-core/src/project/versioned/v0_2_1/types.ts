// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {BaseDataSource, TemplateBase} from '../base';
import {ProjectManifestV0_2_0} from '../v0_2_0';

export interface ProjectManifestV0_2_1<T extends object = TemplateBase, D extends object = BaseDataSource<unknown>>
  extends ProjectManifestV0_2_0<D> {
  dataSources: D[];
  templates?: T[];
}
