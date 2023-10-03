// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { isMainThread } from 'node:worker_threads';
import { toRfc3339WithNanoseconds } from '@cosmjs/tendermint-rpc';
import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  NodeConfig,
  StoreService,
  PoiService,
  BaseProjectService,
  IProjectUpgradeService,
} from '@subql/node-core';
import { Sequelize } from '@subql/x-sequelize';
import { SubqueryProject, CosmosProjectDs } from '../configure/SubqueryProject';
import { ApiService } from './api.service';
import { DsProcessorService } from './ds-processor.service';
import { DynamicDsService } from './dynamic-ds.service';
import { UnfinalizedBlocksService } from './unfinalizedBlocks.service';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: packageVersion } = require('../../package.json');

@Injectable()
export class ProjectService extends BaseProjectService<
  ApiService,
  CosmosProjectDs
> {
  protected packageVersion = packageVersion;

  constructor(
    dsProcessorService: DsProcessorService,
    apiService: ApiService,
    @Inject(isMainThread ? PoiService : 'Null') poiService: PoiService,
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
    const response = await this.apiService.api.blockInfo(height);
    return new Date(toRfc3339WithNanoseconds(response.block.header.time));
  }

  protected onProjectChange(project: SubqueryProject): void | Promise<void> {
    // TODO update this when implementing skipBlock feature for Eth
    // this.apiService.updateBlockFetching();
  }
}
