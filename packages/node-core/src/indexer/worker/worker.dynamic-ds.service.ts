// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {isMainThread} from 'node:worker_threads';
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
  constructor(private host: HostDynamicDS<DS>) {
    if (isMainThread) {
      throw new Error('Expected to be worker thread');
    }
  }

  get dynamicDatasources(): DS[] {
    throw new Error('Worker does not support this property. Use getDynamicDatasources instead');
  }

  async createDynamicDatasource(params: DatasourceParams): Promise<DS> {
    // Make sure the params are serializable over the bridge by using JSON conversion
    return this.host.dynamicDsCreateDynamicDatasource(JSON.parse(JSON.stringify(params)));
  }

  async getDynamicDatasources(): Promise<DS[]> {
    return this.host.dynamicDsGetDynamicDatasources();
  }
}

export function dynamicDsHostFunctions<DS>(dynamicDsService: IDynamicDsService<DS>): HostDynamicDS<DS> {
  return {
    dynamicDsCreateDynamicDatasource: dynamicDsService.createDynamicDatasource.bind(dynamicDsService),
    dynamicDsGetDynamicDatasources: dynamicDsService.getDynamicDatasources.bind(dynamicDsService),
  };
}
