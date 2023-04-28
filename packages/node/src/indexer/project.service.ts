// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  NodeConfig,
  StoreService,
  PoiService,
  MmrService,
  getLogger,
  BaseProjectService,
} from '@subql/node-core';
import { SubstrateDatasource } from '@subql/types';
import { Sequelize } from 'sequelize';
import {
  generateTimestampReferenceForBlockFilters,
  SubqlProjectDs,
  SubqueryProject,
} from '../configure/SubqueryProject';
import { reindex } from '../utils/reindex';
import { ApiService } from './api.service';
import { DsProcessorService } from './ds-processor.service';
import { DynamicDsService } from './dynamic-ds.service';
import { UnfinalizedBlocksService } from './unfinalizedBlocks.service';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: packageVersion } = require('../../package.json');

const logger = getLogger('Project');

@Injectable()
export class ProjectService extends BaseProjectService<SubstrateDatasource> {
  protected packageVersion = packageVersion;

  constructor(
    dsProcessorService: DsProcessorService,
    apiService: ApiService,
    poiService: PoiService,
    mmrService: MmrService,
    sequelize: Sequelize,
    @Inject('ISubqueryProject') project: SubqueryProject,
    storeService: StoreService,
    nodeConfig: NodeConfig,
    dynamicDsService: DynamicDsService,
    eventEmitter: EventEmitter2,
    private unfinalizedBlockService: UnfinalizedBlocksService,
  ) {
    super(
      dsProcessorService,
      apiService,
      poiService,
      mmrService,
      sequelize,
      project,
      storeService,
      nodeConfig,
      dynamicDsService,
      eventEmitter,
    );
  }

  protected async generateTimestampReferenceForBlockFilters(
    ds: SubqlProjectDs[],
  ): Promise<SubqlProjectDs[]> {
    return generateTimestampReferenceForBlockFilters(ds, this.apiService.api);
  }

  protected async initUnfinalized(): Promise<number | undefined> {
    if (this.nodeConfig.unfinalizedBlocks && !this.isHistorical) {
      logger.error(
        'Unfinalized blocks cannot be enabled without historical. You will need to reindex your project to enable historical',
      );
      process.exit(1);
    }

    return this.unfinalizedBlockService.init(this.reindex.bind(this));
  }

  protected getStartBlockDatasources(): SubstrateDatasource[] {
    return this.project.dataSources.filter(
      (ds) =>
        !ds.filter?.specName ||
        ds.filter.specName ===
          this.apiService.api.runtimeVersion.specName.toString(),
    );
  }

  async reindex(targetBlockHeight: number): Promise<void> {
    const lastProcessedHeight = await this.getLastProcessedHeight();

    return reindex(
      this.getStartBlockFromDataSources(),
      await this.getMetadataBlockOffset(),
      targetBlockHeight,
      lastProcessedHeight,
      this.storeService,
      this.unfinalizedBlockService,
      this.dynamicDsService,
      this.mmrService,
      this.sequelize,
      /* Not providing force clean service, it should never be needed */
    );
  }
}
