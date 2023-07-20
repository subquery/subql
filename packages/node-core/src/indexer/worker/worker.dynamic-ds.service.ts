// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Injectable} from '@nestjs/common';
import {DatasourceParams, IDynamicDsService} from '../dynamic-ds.service';

export type HostDynamicDS<DS> = {
  dynamicDsCreateDynamicDatasource: (params: DatasourceParams) => Promise<DS>;
  dynamicDsGetDynamicDatasources: () => Promise<DS[]>;
};

export const hostDynamicDsKeys: (keyof HostDynamicDS<any>)[] = [
  'dynamicDsCreateDynamicDatasource',
  'dynamicDsGetDynamicDatasources',
];

@Injectable()
export class WorkerDynamicDsService<DS> implements IDynamicDsService<DS> {
  constructor(private host: HostDynamicDS<DS>) {}

  async createDynamicDatasource(params: DatasourceParams): Promise<DS> {
    // Make sure the params are serializable over the bridge by using JSON conversion
    return this.host.dynamicDsCreateDynamicDatasource(JSON.parse(JSON.stringify(params)));
  }

  async getDynamicDatasources(): Promise<DS[]> {
    return this.host.dynamicDsGetDynamicDatasources();
  }
}
