import { Inject, Injectable } from '@nestjs/common';
import { LCDClient } from '@terra-money/terra.js';
import { EventEmitter2 } from 'eventemitter2';
import { Sequelize } from 'sequelize/types';
import { NodeConfig } from '../../configure/NodeConfig';
import { SubqueryProject } from '../../configure/project.model';
import { SubqueryModel, SubqueryRepo } from '../../entities';
import { getLogger } from '../../utils/logger';
import { profiler } from '../../utils/profiler';
import { getYargsOption } from '../../yargs';
import { DsProcessorService } from '../ds-processor.service';
import { IndexerEvent } from '../events';
import { StoreService } from '../store.service';
import { ApiTerraService } from './apiterra.service';
import { FetchTerraService } from './fetchterra.service';
import { SandboxTerraService } from './sandboxterra.service';
import { TerraBlockContent } from './types';

const { version: packageVersion } = require('../../package.json');

const DEFAULT_DB_SCHEMA = 'public';

const logger = getLogger('indexer');
const { argv } = getYargsOption();

@Injectable()
export class IndexerTerraManager {
  private api: LCDClient;
  private subqueryState: SubqueryModel;

  constructor(
    private storeService: StoreService,
    private apiService: ApiTerraService,
    private fetchService: FetchTerraService,
    //TODO: implement mmr and poi
    private sequelize: Sequelize,
    private project: SubqueryProject,
    private nodeConfig: NodeConfig,
    private sandboxService: SandboxTerraService,
    private dsProcessorService: DsProcessorService,
    @Inject('Subquery') protected subqueryRepo: SubqueryRepo,
    private eventEmitter: EventEmitter2,
  ) {}

  @profiler(argv.profiler)
  async indexBlock(blockContent: TerraBlockContent): Promise<void> {
    const { block } = blockContent;
    const blockHeight = +block.block.header.height;
    this.eventEmitter.emit(IndexerEvent.BlockProcessing, {
      height: blockHeight,
      timestamp: Date.now(),
    });
    const tx = await this.sequelize.transaction();
    this.storeService.setTransaction(tx);
    //TODO: implement indexBlockFromRuntimeDs
    //TODO: implement indexBlockFromCustomDs
  }
}
