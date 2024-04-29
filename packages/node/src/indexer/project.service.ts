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
  ApiService,
  IProjectUpgradeService,
  profiler,
} from '@subql/node-core';
import { StellarBlockWrapper } from '@subql/types-stellar';
import { Sequelize } from '@subql/x-sequelize';
import { ServerApi } from 'stellar-sdk/lib/horizon';
import {
  //  generateTimestampReferenceForBlockFilters,
  StellarProjectDs,
  SubqueryProject,
} from '../configure/SubqueryProject';
import { StellarApi } from '../stellar';
import SafeStellarProvider from '../stellar/safe-api';
import { DsProcessorService } from './ds-processor.service';
import { DynamicDsService } from './dynamic-ds.service';
import { UnfinalizedBlocksService } from './unfinalizedBlocks.service';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: packageVersion } = require('../../package.json');

@Injectable()
export class ProjectService extends BaseProjectService<
  ApiService<StellarApi, SafeStellarProvider, StellarBlockWrapper[]>,
  StellarProjectDs
> {
  protected packageVersion = packageVersion;

  constructor(
    dsProcessorService: DsProcessorService,
    apiService: ApiService,
    @Inject(isMainThread ? PoiService : 'Null') poiService: PoiService,
    @Inject(isMainThread ? PoiSyncService : 'Null')
    poiSyncService: PoiSyncService,
    @Inject(isMainThread ? Sequelize : 'Null') sequelize: Sequelize,
    @Inject('ISubqueryProject') project: SubqueryProject,
    @Inject('IProjectUpgradeService')
    projectUpgradeService: IProjectUpgradeService<SubqueryProject>,
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

  @profiler()
  async init(startHeight?: number): Promise<void> {
    return super.init(startHeight);
  }

  protected async getBlockTimestamp(height: number): Promise<Date> {
    const block = await this.apiService.unsafeApi.api
      .ledgers()
      .ledger(height)
      .call();

    return new Date((block as unknown as ServerApi.LedgerRecord).closed_at); // TODO test and make sure its in MS not S
  }

  protected onProjectChange(project: SubqueryProject): void | Promise<void> {
    // TODO update this when implementing skipBlock feature for Eth
    // this.apiService.updateBlockFetching();
  }
}
