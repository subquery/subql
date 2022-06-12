// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApiPromise } from '@polkadot/api';
import { RuntimeVersion } from '@polkadot/types/interfaces';
import { hexToU8a, u8aEq } from '@polkadot/util';
import {
  isBlockHandlerProcessor,
  isCallHandlerProcessor,
  isEventHandlerProcessor,
  isCustomDs,
  isRuntimeDs,
  SubstrateCustomDataSource,
  SubstrateCustomHandler,
  SubstrateHandlerKind,
  SubstrateNetworkFilter,
  SubstrateRuntimeHandlerInputMap,
} from '@subql/common-substrate';
import {
  SubstrateBlock,
  SubstrateEvent,
  SubstrateExtrinsic,
} from '@subql/types';
import { Sequelize } from 'sequelize';
import { NodeConfig } from '../configure/NodeConfig';
import { SubqlProjectDs, SubqueryProject } from '../configure/SubqueryProject';
import { SubqueryRepo } from '../entities';
import { getLogger } from '../utils/logger';
import { profiler } from '../utils/profiler';
import * as SubstrateUtil from '../utils/substrate';
import { getYargsOption } from '../yargs';
import { ApiService } from './api.service';
import {
  asSecondLayerHandlerProcessor_1_0_0,
  DsProcessorService,
} from './ds-processor.service';
import { DynamicDsService } from './dynamic-ds.service';
import { PoiService } from './poi.service';
import { PoiBlock } from './PoiBlock';
import { ProjectService } from './project.service';
import { IndexerSandbox, SandboxService } from './sandbox.service';
import { StoreService } from './store.service';
import { BlockContent } from './types';

const NULL_MERKEL_ROOT = hexToU8a('0x00');

const logger = getLogger('indexer');
const { argv } = getYargsOption();

@Injectable()
export class IndexerManager {
  private api: ApiPromise;
  private filteredDataSources: SubqlProjectDs[];

  constructor(
    private storeService: StoreService,
    private apiService: ApiService,
    private poiService: PoiService,
    private sequelize: Sequelize,
    private project: SubqueryProject,
    private nodeConfig: NodeConfig,
    private sandboxService: SandboxService,
    private dsProcessorService: DsProcessorService,
    private dynamicDsService: DynamicDsService,
    @Inject('Subquery') protected subqueryRepo: SubqueryRepo,
    private projectService: ProjectService,
  ) {
    logger.info('indexer manager start');

    this.api = this.apiService.getApi();
  }

  @profiler(argv.profiler)
  async indexBlock(
    blockContent: BlockContent,
    runtimeVersion: RuntimeVersion,
  ): Promise<void> {
    const { block } = blockContent;
    const blockHeight = block.block.header.number.toNumber();
    const tx = await this.sequelize.transaction();
    this.storeService.setTransaction(tx);
    this.storeService.setBlockHeight(blockHeight);

    let poiBlockHash: Uint8Array;
    try {
      // Injected runtimeVersion from fetch service might be outdated
      const apiAt = await this.apiService.getPatchedApi(block, runtimeVersion);

      this.filteredDataSources = this.filterDataSources(
        block.block.header.number.toNumber(),
      );

      const datasources = this.filteredDataSources.concat(
        ...(await this.dynamicDsService.getDynamicDatasources()),
      );

      await this.indexBlockData(
        blockContent,
        datasources,
        (ds: SubqlProjectDs) => {
          const vm = this.sandboxService.getDsProcessor(ds, apiAt);

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
              await this.fetchService.resetForNewDs(blockHeight);
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
      // Need calculate operationHash to ensure correct offset insert all time
      const operationHash = this.storeService.getOperationMerkleRoot();
      if (
        !u8aEq(operationHash, NULL_MERKEL_ROOT) &&
        this.projectService.blockOffset === undefined
      ) {
        await this.projectService.upsertMetadataBlockOffset(
          blockHeight - 1,
          tx,
        );
        this.projectService.setBlockOffset(blockHeight - 1);
      }

      if (this.nodeConfig.proofOfIndex) {
        //check if operation is null, then poi will not be inserted
        if (!u8aEq(operationHash, NULL_MERKEL_ROOT)) {
          const poiBlock = PoiBlock.create(
            blockHeight,
            block.block.header.hash.toHex(),
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
  }

  async start(): Promise<void> {
    await this.projectService.init();
  }

  private filterDataSources(nextProcessingHeight: number): SubqlProjectDs[] {
    let filteredDs: SubqlProjectDs[];
    filteredDs = this.project.dataSources.filter(
      (ds) => ds.startBlock <= nextProcessingHeight,
    );

    if (filteredDs.length === 0) {
      logger.error(`Did not find any matching datasouces`);
      process.exit(1);
    }
    // perform filter for custom ds
    filteredDs = filteredDs.filter((ds) => {
      if (isCustomDs(ds)) {
        return this.dsProcessorService
          .getDsProcessor(ds)
          .dsFilterProcessor(ds, this.api);
      } else {
        return true;
      }
    });

    if (!filteredDs.length) {
      logger.error(`Did not find any datasources with associated processor`);
      process.exit(1);
    }
    return filteredDs;
  }

  private async indexBlockData(
    { block, events, extrinsics }: BlockContent,
    dataSources: SubqlProjectDs[],
    getVM: (d: SubqlProjectDs) => IndexerSandbox,
  ): Promise<void> {
    await this.indexBlockContent(block, dataSources, getVM);

    // Run initialization events
    const initEvents = events.filter((evt) => evt.phase.isInitialization);
    for (const event of initEvents) {
      await this.indexEvent(event, dataSources, getVM);
    }

    for (const extrinsic of extrinsics) {
      await this.indexExtrinsic(extrinsic, dataSources, getVM);

      // Process extrinsic events
      const extrinsicEvents = events
        .filter((e) => e.extrinsic?.idx === extrinsic.idx)
        .sort((a, b) => a.idx - b.idx);

      for (const event of extrinsicEvents) {
        await this.indexEvent(event, dataSources, getVM);
      }
    }

    // Run finalization events
    const finalizeEvents = events.filter((evt) => evt.phase.isFinalization);
    for (const event of finalizeEvents) {
      await this.indexEvent(event, dataSources, getVM);
    }
  }

  private async indexBlockContent(
    block: SubstrateBlock,
    dataSources: SubqlProjectDs[],
    getVM: (d: SubqlProjectDs) => IndexerSandbox,
  ): Promise<void> {
    for (const ds of dataSources) {
      await this.indexData(SubstrateHandlerKind.Block, block, ds, getVM(ds));
    }
  }

  private async indexExtrinsic(
    extrinsic: SubstrateExtrinsic,
    dataSources: SubqlProjectDs[],
    getVM: (d: SubqlProjectDs) => IndexerSandbox,
  ): Promise<void> {
    for (const ds of dataSources) {
      await this.indexData(SubstrateHandlerKind.Call, extrinsic, ds, getVM(ds));
    }
  }

  private async indexEvent(
    event: SubstrateEvent,
    dataSources: SubqlProjectDs[],
    getVM: (d: SubqlProjectDs) => IndexerSandbox,
  ): Promise<void> {
    for (const ds of dataSources) {
      await this.indexData(SubstrateHandlerKind.Event, event, ds, getVM(ds));
    }
  }

  private async indexData<K extends SubstrateHandlerKind>(
    kind: K,
    data: SubstrateRuntimeHandlerInputMap[K],
    ds: SubqlProjectDs,
    vm: IndexerSandbox,
  ): Promise<void> {
    if (isRuntimeDs(ds)) {
      const handlers = ds.mapping.handlers.filter(
        (h) => h.kind === kind && FilterTypeMap[kind](data as any, h.filter),
      );

      for (const handler of handlers) {
        await vm.securedExec(handler.handler, [data]);
      }
    } else if (isCustomDs(ds)) {
      const handlers = this.filterCustomDsHandlers<K>(
        ds,
        data,
        ProcessorTypeMap[kind],
        (data, baseFilter) => {
          switch (kind) {
            case SubstrateHandlerKind.Block:
              return !!SubstrateUtil.filterBlock(
                data as SubstrateBlock,
                baseFilter,
              );
            case SubstrateHandlerKind.Call:
              return !!SubstrateUtil.filterExtrinsics(
                [data as SubstrateExtrinsic],
                baseFilter,
              ).length;
            case SubstrateHandlerKind.Event:
              return !!SubstrateUtil.filterEvents(
                [data as SubstrateEvent],
                baseFilter,
              ).length;
            default:
              throw new Error('Unsuported handler kind');
          }
        },
      );

      for (const handler of handlers) {
        await this.transformAndExecuteCustomDs(ds, vm, handler, data);
      }
    }
  }

  private filterCustomDsHandlers<K extends SubstrateHandlerKind>(
    ds: SubstrateCustomDataSource<string, SubstrateNetworkFilter>,
    data: SubstrateRuntimeHandlerInputMap[K],
    baseHandlerCheck: ProcessorTypeMap[K],
    baseFilter: (
      data: SubstrateRuntimeHandlerInputMap[K],
      baseFilter: any,
    ) => boolean,
  ): SubstrateCustomHandler[] {
    const plugin = this.dsProcessorService.getDsProcessor(ds);

    return ds.mapping.handlers
      .filter((handler) => {
        const processor = plugin.handlerProcessors[handler.kind];
        if (baseHandlerCheck(processor)) {
          processor.baseFilter;
          return baseFilter(data, processor.baseFilter);
        }
        return false;
      })
      .filter((handler) => {
        const processor = asSecondLayerHandlerProcessor_1_0_0(
          plugin.handlerProcessors[handler.kind],
        );

        try {
          return processor.filterProcessor({
            filter: handler.filter,
            input: data,
            ds,
          });
        } catch (e) {
          logger.error(e, 'Failed to run ds processer filter.');
          throw e;
        }
      });
  }

  private async transformAndExecuteCustomDs<K extends SubstrateHandlerKind>(
    ds: SubstrateCustomDataSource<string, SubstrateNetworkFilter>,
    vm: IndexerSandbox,
    handler: SubstrateCustomHandler,
    data: SubstrateRuntimeHandlerInputMap[K],
  ): Promise<void> {
    const plugin = this.dsProcessorService.getDsProcessor(ds);
    const assets = await this.dsProcessorService.getAssets(ds);

    const processor = asSecondLayerHandlerProcessor_1_0_0(
      plugin.handlerProcessors[handler.kind],
    );

    const transformedData = await processor
      .transformer({
        input: data,
        ds,
        filter: handler.filter,
        api: this.api,
        assets,
      })
      .catch((e) => {
        logger.error(e, 'Failed to transform data with ds processor.');
        throw e;
      });

    await Promise.all(
      transformedData.map((data) => vm.securedExec(handler.handler, [data])),
    );
  }
}

type ProcessorTypeMap = {
  [SubstrateHandlerKind.Block]: typeof isBlockHandlerProcessor;
  [SubstrateHandlerKind.Event]: typeof isEventHandlerProcessor;
  [SubstrateHandlerKind.Call]: typeof isCallHandlerProcessor;
};

const ProcessorTypeMap = {
  [SubstrateHandlerKind.Block]: isBlockHandlerProcessor,
  [SubstrateHandlerKind.Event]: isEventHandlerProcessor,
  [SubstrateHandlerKind.Call]: isCallHandlerProcessor,
};

const FilterTypeMap = {
  [SubstrateHandlerKind.Block]: SubstrateUtil.filterBlock,
  [SubstrateHandlerKind.Event]: SubstrateUtil.filterEvent,
  [SubstrateHandlerKind.Call]: SubstrateUtil.filterExtrinsic,
};
