// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Inject, Injectable } from '@nestjs/common';
import { hexToU8a, u8aEq } from '@polkadot/util';
import {
  ApiService,
  PoiBlock,
  StoreService,
  PoiService,
  SubqueryRepo,
  NodeConfig,
  getYargsOption,
  getLogger,
  profiler,
  profilerWrap,
} from '@subql/node-core';
import {
  ApiWrapper,
  AvalancheTransaction,
  AvalancheLog,
  AvalancheBlock,
  SubqlRuntimeHandler,
  AvalancheBlockWrapper,
  AvalancheHandlerKind,
  AvalancheRuntimeHandlerInputMap,
} from '@subql/types-avalanche';
import { Sequelize } from 'sequelize';
import { AvalancheBlockWrapped } from '../avalanche/block.avalanche';
import { SubqlProjectDs, SubqueryProject } from '../configure/SubqueryProject';
import { DynamicDsService } from './dynamic-ds.service';
import { ProjectService } from './project.service';
import { IndexerSandbox, SandboxService } from './sandbox.service';

const NULL_MERKEL_ROOT = hexToU8a('0x00');

const logger = getLogger('indexer');
const { argv } = getYargsOption();

@Injectable()
export class IndexerManager {
  private api: ApiWrapper;
  private filteredDataSources: SubqlProjectDs[];

  constructor(
    private storeService: StoreService,
    private apiService: ApiService,
    private poiService: PoiService,
    private sequelize: Sequelize,
    private project: SubqueryProject,
    private nodeConfig: NodeConfig,
    private sandboxService: SandboxService,
    private dynamicDsService: DynamicDsService,
    @Inject('Subquery') protected subqueryRepo: SubqueryRepo,
    private projectService: ProjectService,
  ) {
    logger.info('indexer manager start');

    this.api = this.apiService.api;
  }

  @profiler(argv.profiler)
  async indexBlock(
    blockContent: AvalancheBlockWrapper,
  ): Promise<{ dynamicDsCreated: boolean; operationHash: Uint8Array }> {
    const { blockHeight } = blockContent;
    let dynamicDsCreated = false;
    const tx = await this.sequelize.transaction();
    this.storeService.setTransaction(tx);
    this.storeService.setBlockHeight(blockHeight);

    let operationHash = NULL_MERKEL_ROOT;
    let poiBlockHash: Uint8Array;

    try {
      this.filteredDataSources = this.filterDataSources(blockHeight);

      const datasources = this.filteredDataSources.concat(
        ...(await this.dynamicDsService.getDynamicDatasources()),
      );

      await this.indexBlockData(
        blockContent,
        datasources,
        // eslint-disable-next-line @typescript-eslint/require-await
        async (ds: SubqlProjectDs) => {
          const vm = this.sandboxService.getDsProcessorWrapper(
            ds,
            this.api,
            blockContent,
          );

          // Inject function to create ds into vm
          vm.freeze(
            async (templateName: string, args?: Record<string, unknown>) => {
              const newDs = await this.dynamicDsService.createDynamicDatasource(
                {
                  templateName,
                  args,
                  startBlock: blockHeight,
                },
                tx,
              );
              // Push the newly created dynamic ds to be processed this block on any future extrinsics/events
              datasources.push(newDs);
              dynamicDsCreated = true;
            },
            'createDynamicDatasource',
          );

          return vm;
        },
      );

      await this.storeService.setMetadataBatch(
        [
          { key: 'lastProcessedHeight', value: blockHeight },
          { key: 'lastProcessedTimestamp', value: Date.now() },
        ],
        { transaction: tx },
      );
      // Db Metadata increase BlockCount, in memory ref to block-dispatcher _processedBlockCount
      await this.storeService.incrementBlockCount(tx);

      // Need calculate operationHash to ensure correct offset insert all time
      operationHash = this.storeService.getOperationMerkleRoot();
      if (this.nodeConfig.proofOfIndex) {
        //check if operation is null, then poi will not be inserted
        if (!u8aEq(operationHash, NULL_MERKEL_ROOT)) {
          const poiBlock = PoiBlock.create(
            blockHeight,
            blockContent.block.hash,
            operationHash,
            await this.poiService.getLatestPoiBlockHash(),
            this.project.id,
          );
          poiBlockHash = poiBlock.hash;
          await this.storeService.setPoi(poiBlock, { transaction: tx });
          this.poiService.setLatestPoiBlockHash(poiBlockHash);
          await this.storeService.setMetadataBatch(
            [{ key: 'lastPoiHeight', value: blockHeight }],
            { transaction: tx },
          );
        }
      }
    } catch (e) {
      await tx.rollback();
      throw e;
    }

    await tx.commit();

    return {
      dynamicDsCreated,
      operationHash,
    };
  }

  async start(): Promise<void> {
    await this.projectService.init();
  }

  private filterDataSources(processedHeight: number): SubqlProjectDs[] {
    let filteredDs = this.getDataSourcesForSpecName();
    if (filteredDs.length === 0) {
      logger.error(
        `Did not find any dataSource match with network specName ${this.api.getSpecName()}`,
      );
      process.exit(1);
    }
    filteredDs = filteredDs.filter((ds) => ds.startBlock <= processedHeight);
    if (filteredDs.length === 0) {
      logger.error(
        `Your start block is greater than the current indexed block height in your database. Either change your startBlock (project.yaml) to <= ${processedHeight}
         or delete your database and start again from the currently specified startBlock`,
      );
      process.exit(1);
    }
    // perform filter for custom ds
    if (!filteredDs.length) {
      logger.error(`Did not find any datasources with associated processor`);
      process.exit(1);
    }
    return filteredDs;
  }

  private getDataSourcesForSpecName(): SubqlProjectDs[] {
    return this.project.dataSources.filter(
      (ds) =>
        !ds.filter?.specName || ds.filter.specName === this.api.getSpecName(),
    );
  }

  private async indexBlockData(
    { block, logs, transactions }: AvalancheBlockWrapper,
    dataSources: SubqlProjectDs[],
    getVM: (d: SubqlProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    await this.indexBlockContent(block, dataSources, getVM);

    for (const log of logs) {
      await this.indexEvent(log, dataSources, getVM);
    }

    for (const tx of transactions) {
      await this.indexExtrinsic(tx, dataSources, getVM);
    }
  }

  private async indexBlockContent(
    block: AvalancheBlock,
    dataSources: SubqlProjectDs[],
    getVM: (d: SubqlProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    for (const ds of dataSources) {
      await this.indexData(AvalancheHandlerKind.Block, block, ds, getVM);
    }
  }

  private async indexExtrinsic(
    tx: AvalancheTransaction,
    dataSources: SubqlProjectDs[],
    getVM: (d: SubqlProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    for (const ds of dataSources) {
      await this.indexData(AvalancheHandlerKind.Call, tx, ds, getVM);
    }
  }

  private async indexEvent(
    log: AvalancheLog,
    dataSources: SubqlProjectDs[],
    getVM: (d: SubqlProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    for (const ds of dataSources) {
      await this.indexData(AvalancheHandlerKind.Event, log, ds, getVM);
    }
  }

  private async indexData<K extends AvalancheHandlerKind>(
    kind: K,
    data: AvalancheRuntimeHandlerInputMap[K],
    ds: SubqlProjectDs,
    getVM: (ds: SubqlProjectDs) => Promise<IndexerSandbox>,
  ): Promise<void> {
    let vm: IndexerSandbox;
    const handlers = (ds.mapping.handlers as SubqlRuntimeHandler[]).filter(
      (h) =>
        h.kind === kind && FilterTypeMap[kind](data as any, h.filter as any),
    );

    for (const handler of handlers) {
      vm = vm ?? (await getVM(ds));
      await vm.securedExec(handler.handler, [data]);
    }
  }
}

const FilterTypeMap = {
  [AvalancheHandlerKind.Block]: AvalancheBlockWrapped.filterBlocksProcessor,
  [AvalancheHandlerKind.Event]: AvalancheBlockWrapped.filterLogsProcessor,
  [AvalancheHandlerKind.Call]:
    AvalancheBlockWrapped.filterTransactionsProcessor,
};
