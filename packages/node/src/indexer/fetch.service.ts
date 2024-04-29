// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SchedulerRegistry } from '@nestjs/schedule';

import { StellarHandlerKind, isCustomDs } from '@subql/common-stellar';
import {
  NodeConfig,
  BaseFetchService,
  ApiService,
  getModulos,
} from '@subql/node-core';
import { StellarBlock, SubqlDatasource } from '@subql/types-stellar';
import { SubqueryProject } from '../configure/SubqueryProject';
import { StellarApi } from '../stellar';
import { blockToHeader, calcInterval } from '../stellar/utils.stellar';
import { IStellarBlockDispatcher } from './blockDispatcher';
import { StellarDictionaryService } from './dictionary';
import { ProjectService } from './project.service';
import { UnfinalizedBlocksService } from './unfinalizedBlocks.service';

const BLOCK_TIME_VARIANCE = 5000;

const INTERVAL_PERCENT = 0.9;

@Injectable()
export class FetchService extends BaseFetchService<
  SubqlDatasource,
  IStellarBlockDispatcher,
  StellarBlock
> {
  constructor(
    private apiService: ApiService,
    nodeConfig: NodeConfig,
    @Inject('IProjectService') projectService: ProjectService,
    @Inject('ISubqueryProject') project: SubqueryProject,
    @Inject('IBlockDispatcher')
    blockDispatcher: IStellarBlockDispatcher,
    dictionaryService: StellarDictionaryService,
    private unfinalizedBlocksService: UnfinalizedBlocksService,
    eventEmitter: EventEmitter2,
    schedulerRegistry: SchedulerRegistry,
  ) {
    super(
      nodeConfig,
      projectService,
      project.network,
      blockDispatcher,
      dictionaryService,
      eventEmitter,
      schedulerRegistry,
    );
  }

  get api(): StellarApi {
    return this.apiService.unsafeApi;
  }

  protected async getFinalizedHeight(): Promise<number> {
    const sequence = await this.api.getFinalizedBlockHeight();

    const header = blockToHeader(sequence);

    this.unfinalizedBlocksService.registerFinalizedBlock(header);
    return header.blockHeight;
  }

  protected async getBestHeight(): Promise<number> {
    return this.api.getBestBlockHeight();
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  protected async getChainInterval(): Promise<number> {
    const CHAIN_INTERVAL = calcInterval(this.api) * INTERVAL_PERCENT;

    return Math.min(BLOCK_TIME_VARIANCE, CHAIN_INTERVAL);
  }

  protected async getChainId(): Promise<string> {
    return Promise.resolve(this.api.getChainId().toString());
  }

  protected getModulos(): number[] {
    return getModulos(
      this.projectService.getAllDataSources(),
      isCustomDs,
      StellarHandlerKind.Block,
    );
  }

  protected async initBlockDispatcher(): Promise<void> {
    await this.blockDispatcher.init(this.resetForNewDs.bind(this));
  }

  protected async preLoopHook(): Promise<void> {
    // Stellar doesn't need to do anything here
    return Promise.resolve();
  }
}
