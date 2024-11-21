// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {StoreCacheService} from './storeCache.service';
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
