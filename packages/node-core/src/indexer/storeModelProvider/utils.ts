// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {StoreCacheService} from './storeCache.service';
import {PlainStoreModelService} from './storeModel.service';
import {IStoreModelProvider} from './types';

export async function cacheProviderFlushData(modelProvider: IStoreModelProvider, forceFlush?: boolean) {
  if (modelProvider instanceof StoreCacheService) {
    await modelProvider.flushData(forceFlush);
  }
}
export async function cacheProviderResetData(modelProvider: IStoreModelProvider) {
  if (modelProvider instanceof StoreCacheService) {
    await modelProvider.resetData();
  }
}

export function storeModelFactory(
  nodeConfig: any,
  eventEmitter: any,
  schedulerRegistry: any,
  sequelize: any
): IStoreModelProvider {
  return nodeConfig.enableCache
    ? new StoreCacheService(sequelize, nodeConfig, eventEmitter, schedulerRegistry)
    : new PlainStoreModelService(sequelize, nodeConfig);
}
