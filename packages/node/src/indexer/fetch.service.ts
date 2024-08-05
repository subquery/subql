// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SchedulerRegistry } from '@nestjs/schedule';
import {
  NodeConfig,
  BaseFetchService,
  IStoreModelProvider,
  UnfinalizedBlocksService,
  ProjectService,
  IBlockDispatcher,
} from '@subql/node-core';
import { SubstrateDatasource, SubstrateBlock } from '@subql/types';
import { BlockchainService } from '../blockchain.service';
import { SubstrateDictionaryService } from './dictionary/substrateDictionary.service';
import { RuntimeService } from './runtime/runtimeService';

@Injectable()
export class FetchService extends BaseFetchService<
  SubstrateDatasource,
  IBlockDispatcher<SubstrateBlock>,
  SubstrateBlock
> {
  constructor(
    nodeConfig: NodeConfig,
    @Inject('IProjectService')
    projectService: ProjectService<SubstrateDatasource>,
    @Inject('IBlockDispatcher')
    blockDispatcher: IBlockDispatcher<SubstrateBlock>,
    dictionaryService: SubstrateDictionaryService,
    @Inject('IUnfinalizedBlocksService')
    unfinalizedBlocksService: UnfinalizedBlocksService<SubstrateBlock>,
    eventEmitter: EventEmitter2,
    schedulerRegistry: SchedulerRegistry,
    @Inject('RuntimeService') private runtimeService: RuntimeService,
    @Inject('IStoreModelProvider') storeModelProvider: IStoreModelProvider,
    @Inject('IBlockchainService') blockchainService: BlockchainService,
  ) {
    super(
      nodeConfig,
      projectService,
      blockDispatcher,
      dictionaryService,
      eventEmitter,
      schedulerRegistry,
      unfinalizedBlocksService,
      storeModelProvider,
      blockchainService,
    );
  }

  protected async initBlockDispatcher(): Promise<void> {
    await this.blockDispatcher.init(this.resetForNewDs.bind(this));
  }

  protected async preLoopHook({
    startHeight,
  }: {
    startHeight: number;
  }): Promise<void> {
    await this.runtimeService.init(
      startHeight,
      this.getLatestFinalizedHeight(),
    );
  }
}
