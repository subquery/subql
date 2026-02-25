// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {isMainThread} from 'node:worker_threads';
import {Injectable} from '@nestjs/common';
import {DynamicDatasourceInfo} from '@subql/types-core';
import {DatasourceParams, IDynamicDsService} from '../dynamic-ds.service';

export type HostDynamicDS<DS> = {
  dynamicDsCreateDynamicDatasource: (params: DatasourceParams) => Promise<DS>;
  dynamicDsDestroyDynamicDatasource: (templateName: string, currentBlockHeight: number, index: number) => Promise<void>;
  dynamicDsGetDynamicDatasources: () => Promise<DS[]>;
  dynamicDsGetDynamicDatasourcesByTemplate: (templateName: string) => DynamicDatasourceInfo[];
  dynamicDsGetDatasourceParamByIndex: (index: number) => DatasourceParams | undefined;
};

export const hostDynamicDsKeys: (keyof HostDynamicDS<any>)[] = [
  'dynamicDsCreateDynamicDatasource',
  'dynamicDsDestroyDynamicDatasource',
  'dynamicDsGetDynamicDatasources',
  'dynamicDsGetDynamicDatasourcesByTemplate',
  'dynamicDsGetDatasourceParamByIndex',
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

  async destroyDynamicDatasource(templateName: string, currentBlockHeight: number, index: number): Promise<void> {
    return this.host.dynamicDsDestroyDynamicDatasource(templateName, currentBlockHeight, index);
  }

  async getDynamicDatasources(): Promise<DS[]> {
    return this.host.dynamicDsGetDynamicDatasources();
  }

  getDynamicDatasourcesByTemplate(templateName: string): DynamicDatasourceInfo[] {
    return this.host.dynamicDsGetDynamicDatasourcesByTemplate(templateName);
  }

  getDatasourceParamByIndex(index: number): DatasourceParams | undefined {
    return this.host.dynamicDsGetDatasourceParamByIndex(index);
  }
}

export function dynamicDsHostFunctions<DS>(dynamicDsService: IDynamicDsService<DS>): HostDynamicDS<DS> {
  return {
    dynamicDsCreateDynamicDatasource: dynamicDsService.createDynamicDatasource.bind(dynamicDsService),
    dynamicDsDestroyDynamicDatasource: dynamicDsService.destroyDynamicDatasource.bind(dynamicDsService),
    dynamicDsGetDynamicDatasources: dynamicDsService.getDynamicDatasources.bind(dynamicDsService),
    dynamicDsGetDynamicDatasourcesByTemplate: dynamicDsService.getDynamicDatasourcesByTemplate.bind(dynamicDsService),
    dynamicDsGetDatasourceParamByIndex: dynamicDsService.getDatasourceParamByIndex.bind(dynamicDsService),
  };
}
