// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {EventEmitter2} from '@nestjs/event-emitter';
import {SchedulerRegistry} from '@nestjs/schedule';
import {Sequelize} from '@subql/x-sequelize';
import {NodeConfig} from '../../configure';
import {StoreCacheService} from './storeCache.service';
import {PlainStoreModelService} from './storeModel.service';
import {IStoreModelProvider} from './types';

export async function cacheProviderFlushData(modelProvider: IStoreModelProvider, forceFlush?: boolean): Promise<void> {
  if (modelProvider instanceof StoreCacheService) {
    await modelProvider.flushData(forceFlush);
  }
}
export async function cacheProviderResetData(modelProvider: IStoreModelProvider): Promise<void> {
  if (modelProvider instanceof StoreCacheService) {
    await modelProvider.resetData();
  }
}

export function storeModelFactory(
  nodeConfig: NodeConfig,
  eventEmitter: EventEmitter2,
  schedulerRegistry: SchedulerRegistry,
  sequelize: Sequelize
): IStoreModelProvider {
  return nodeConfig.enableCache
    ? new StoreCacheService(sequelize, nodeConfig, eventEmitter, schedulerRegistry)
    : new PlainStoreModelService(sequelize, nodeConfig);
}
