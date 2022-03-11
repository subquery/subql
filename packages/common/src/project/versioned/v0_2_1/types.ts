// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {BaseDataSource} from '../base';
import {ProjectManifestV0_2_0} from '../v0_2_0';

export interface TemplateBase {
  name: string;
}

export interface ProjectManifestV0_2_1<T extends object = TemplateBase, D extends object = BaseDataSource<unknown>>
  extends ProjectManifestV0_2_0<D> {
  dataSources: D[];
  templates?: T[];
}
