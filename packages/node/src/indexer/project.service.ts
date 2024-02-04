// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { isMainThread } from 'worker_threads';
import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  PoiService,
  PoiSyncService,
  BaseProjectService,
  StoreService,
  NodeConfig,
  IProjectUpgradeService,
  ApiService,
} from '@subql/node-core';
import { Sequelize } from '@subql/x-sequelize';
import {
  EthereumProjectDs,
  SubqueryProject,
} from '../configure/SubqueryProject';
import { EthereumApiService } from '../ethereum';
import { DsProcessorService } from './ds-processor.service';
import { DynamicDsService } from './dynamic-ds.service';
import { UnfinalizedBlocksService } from './unfinalizedBlocks.service';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: packageVersion } = require('../../package.json');

@Injectable()
export class ProjectService extends BaseProjectService<
  EthereumApiService,
  EthereumProjectDs,
  UnfinalizedBlocksService
> {
  protected packageVersion = packageVersion;

  constructor(
    dsProcessorService: DsProcessorService,
    @Inject(ApiService) apiService: EthereumApiService,
    @Inject(isMainThread ? PoiService : 'Null') poiService: PoiService,
    @Inject(isMainThread ? PoiSyncService : 'Null')
    poiSyncService: PoiSyncService,
    @Inject(isMainThread ? Sequelize : 'Null') sequelize: Sequelize,
    @Inject('ISubqueryProject') project: SubqueryProject,
    @Inject('IProjectUpgradeService')
    protected readonly projectUpgradeService: IProjectUpgradeService<SubqueryProject>,
    @Inject(isMainThread ? StoreService : 'Null') storeService: StoreService,
    nodeConfig: NodeConfig,
    dynamicDsService: DynamicDsService,
    eventEmitter: EventEmitter2,
    unfinalizedBlockService: UnfinalizedBlocksService,
  ) {
    super(
      dsProcessorService,
      apiService,
      poiService,
      poiSyncService,
      sequelize,
      project,
      projectUpgradeService,
      storeService,
      nodeConfig,
      dynamicDsService,
      eventEmitter,
      unfinalizedBlockService,
    );
  }

  protected async getBlockTimestamp(height: number): Promise<Date> {
    const block = await this.apiService.unsafeApi.api.getBlock(height);

    return new Date(block.timestamp * 1000); // TODO test and make sure its in MS not S
  }

  protected onProjectChange(project: SubqueryProject): void | Promise<void> {
    // TODO update this when implementing skipBlock feature for Eth
    this.apiService.updateBlockFetching();
  }

  protected async initUnfinalized(): Promise<number | undefined> {
    return this.unfinalizedBlockService.init(
      this.reindex.bind(this),
      this.apiService.api.supportsFinalization,
    );
  }
}
