// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
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
import {
  BlockContent,
  getBlockSize,
  isFullBlock,
  LightBlockContent,
} from '../types';

export type FetchBlockResponse = Header & { specVersion?: number };

@Injectable()
export class WorkerService extends BaseWorkerService<
  BlockContent | LightBlockContent,
  FetchBlockResponse,
  SubstrateDatasource,
  { specVersion: number }
> {
  constructor(
    private apiService: ApiService,
    private indexerManager: IndexerManager,
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
    block: BlockContent /* | LightBlockContent*/,
  ): FetchBlockResponse {
    return {
      ...substrateBlockToHeader(block.block),
      specVersion: block.block.specVersion,
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
    const runtimeVersion = !isFullBlock(block.block)
      ? undefined
      : await this.workerRuntimeService.getRuntimeVersion(block.block.block);

    return this.indexerManager.indexBlock(block, dataSources, runtimeVersion);
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
