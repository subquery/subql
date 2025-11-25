// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Inject, Injectable } from '@nestjs/common';
import {
  NodeConfig,
  IProjectService,
  ProcessBlockResponse,
  BaseWorkerService,
  IProjectUpgradeService,
  IBlock,
  Header,
} from '@subql/node-core';
import { SubstrateDatasource } from '@subql/types';
import { substrateBlockToHeader } from '../../utils/substrate';
import { ApiService } from '../api.service';
import { SpecVersion } from '../dictionary';
import { IndexerManager } from '../indexer.manager';
import { WorkerRuntimeService } from '../runtime/workerRuntimeService';
import { BlockContent, getBlockSize, LightBlockContent } from '../types';

export type FetchBlockResponse = Header & { specVersion?: number };

@Injectable()
export class WorkerService extends BaseWorkerService<
  BlockContent | LightBlockContent,
  FetchBlockResponse,
  SubstrateDatasource,
  { specVersion: number }
> {
  constructor(
    @Inject('APIService') private apiService: ApiService,
    private indexerManager: IndexerManager,
    @Inject('RuntimeService')
    private workerRuntimeService: WorkerRuntimeService,
    @Inject('IProjectService')
    projectService: IProjectService<SubstrateDatasource>,
    @Inject('IProjectUpgradeService')
    projectUpgradeService: IProjectUpgradeService,
    nodeConfig: NodeConfig,
  ) {
    super(projectService, projectUpgradeService, nodeConfig);
  }

  protected async fetchChainBlock(
    height: number,
    { specVersion }: { specVersion: number },
  ): Promise<IBlock<BlockContent | LightBlockContent>> {
    const specChanged = await this.workerRuntimeService.specChanged(
      height,
      specVersion,
    );

    const [block] = await this.apiService.fetchBlocks(
      [height],
      specChanged ? undefined : this.workerRuntimeService.parentSpecVersion,
    );

    return block;
  }

  // TODO test this with LightBlockContent
  protected toBlockResponse(
    block: IBlock<BlockContent> /*| IBlock<LightBlockContent>*/,
  ): FetchBlockResponse {
    return {
      ...block.getHeader(),
      specVersion: block.block.block.specVersion,
    };
  }

  protected getBlockSize(
    block: IBlock<BlockContent | LightBlockContent>,
  ): number {
    return getBlockSize(block);
  }

  protected async processFetchedBlock(
    block: IBlock<BlockContent | LightBlockContent>,
    dataSources: SubstrateDatasource[],
  ): Promise<ProcessBlockResponse> {
    return this.indexerManager.indexBlock(block, dataSources);
  }

  getSpecFromMap(height: number): number | undefined {
    return this.workerRuntimeService.getSpecFromMap(
      height,
      this.workerRuntimeService.specVersionMap,
    );
  }

  syncRuntimeService(
    specVersions: SpecVersion[],
    latestFinalizedHeight?: number,
  ): void {
    this.workerRuntimeService.syncSpecVersionMap(
      specVersions,
      latestFinalizedHeight,
    );
  }
}
