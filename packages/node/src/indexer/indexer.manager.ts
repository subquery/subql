// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import { Inject, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ApiPromise } from '@polkadot/api';
import { buildSchema, getAllEntities, SubqlKind } from '@subql/common';
import { QueryTypes, Sequelize } from 'sequelize';
import { NodeConfig } from '../configure/NodeConfig';
import { SubqueryProject } from '../configure/project.model';
import { SubqueryModel, SubqueryRepo } from '../entities';
import { objectTypeToModelAttributes } from '../utils/graphql';
import { getLogger } from '../utils/logger';
import * as SubstrateUtil from '../utils/substrate';
import { ApiService } from './api.service';
import { FetchService } from './fetch.service';
import { IndexerSandbox } from './sandbox';
import { StoreService } from './store.service';
import { BlockContent } from './types';

const DEFAULT_DB_SCHEMA = 'public';

const logger = getLogger('indexer');

@Injectable()
export class IndexerManager implements OnApplicationBootstrap {
  private vm: IndexerSandbox;
  private api: ApiPromise;
  private subqueryState: SubqueryModel;

  constructor(
    protected apiService: ApiService,
    protected storeService: StoreService,
    protected fetchService: FetchService,
    protected sequelize: Sequelize,
    protected project: SubqueryProject,
    protected nodeConfig: NodeConfig,
    @Inject('Subquery') protected subqueryRepo: SubqueryRepo,
  ) {}

  async indexBlock({ block, events, extrinsics }: BlockContent): Promise<void> {
    const tx = await this.sequelize.transaction();
    this.storeService.setTransaction(tx);
    try {
      await this.apiService.setBlockhash(block.block.hash);
      for (const ds of this.project.dataSources) {
        if (ds.startBlock > block.block.header.number.toNumber()) {
          continue;
        }
        if (ds.kind === SubqlKind.Runtime) {
          for (const handler of ds.mapping.handlers) {
            switch (handler.kind) {
              case SubqlKind.BlockHandler:
                if (SubstrateUtil.filterBlock(block, handler.filter)) {
                  await this.vm.securedExec(handler.handler, [block]);
                }
                break;
              case SubqlKind.CallHandler: {
                const filteredExtrinsics = SubstrateUtil.filterExtrinsics(
                  extrinsics,
                  handler.filter,
                );
                await Promise.all(
                  filteredExtrinsics.map(async (e) =>
                    this.vm.securedExec(handler.handler, [e]),
                  ),
                );
                break;
              }
              case SubqlKind.EventHandler: {
                const filteredEvents = SubstrateUtil.filterEvents(
                  events,
                  handler.filter,
                );
                await Promise.all(
                  filteredEvents.map(async (e) =>
                    this.vm.securedExec(handler.handler, [e]),
                  ),
                );
                break;
              }
              default:
            }
          }
        }
        // TODO: support Ink! and EVM
      }
      this.subqueryState.nextBlockHeight =
        block.block.header.number.toNumber() + 1;
      await this.subqueryState.save();
      this.fetchService.latestProcessed(block.block.header.number.toNumber());
    } catch (e) {
      logger.error(
        `failed to handler block ${block.block.header.number.toString()}, error: ${
          e?.message
        }`,
      );
      try {
        await tx.rollback();
      } finally {
        process.exit(1);
      }
    }
    await tx.commit();
  }

  async onApplicationBootstrap(): Promise<void> {
    this.api = this.apiService.getApi();
    this.subqueryState = await this.ensureProject(this.nodeConfig.subqueryName);
    await this.initDbSchema();
    await this.initVM();
    void this.fetchService
      .startLoop(this.subqueryState.nextBlockHeight)
      .catch((err) => {
        logger.error('failed to fetch block', err);
        // FIXME: retry before exit
        process.exit(1);
      });
    this.fetchService.register((block) => this.indexBlock(block));
  }

  private async initVM(): Promise<void> {
    const api = await this.apiService.getPatchedApi();
    this.vm = new IndexerSandbox({
      store: this.storeService.getStore(),
      api,
      root: this.project.path,
    });

    this.vm.on('console.log', (data) => getLogger('sandbox').log(data));
  }

  private async ensureProject(name: string): Promise<SubqueryModel> {
    let project = await this.subqueryRepo.findOne({
      where: { name: this.nodeConfig.subqueryName },
    });
    if (!project) {
      let projectSchema: string;
      if (this.nodeConfig.localMode) {
        // create tables in default schema if local mode is enabled
        projectSchema = DEFAULT_DB_SCHEMA;
      } else {
        const suffix = await this.nextSubquerySchemaSuffix();
        projectSchema = `subquery_${suffix}`;
        const schemas = await this.sequelize.showAllSchemas(undefined);
        if (!((schemas as unknown) as string[]).includes(projectSchema)) {
          await this.sequelize.createSchema(projectSchema, undefined);
        }
      }

      project = await this.subqueryRepo.create({
        name,
        dbSchema: projectSchema,
        hash: '0x',
        nextBlockHeight: Math.min(
          ...this.project.dataSources.map((item) => item.startBlock ?? 1),
        ),
      });
    }
    return project;
  }

  private async initDbSchema(): Promise<void> {
    const schema = this.subqueryState.dbSchema;
    const graphqlSchema = buildSchema(
      path.join(this.project.path, this.project.schema),
    );
    const models = getAllEntities(graphqlSchema).map((entity) => {
      const modelAttributes = objectTypeToModelAttributes(entity);
      return { name: entity.name, attributes: modelAttributes };
    });
    await this.storeService.syncSchema(models, schema);
  }

  private async nextSubquerySchemaSuffix(): Promise<number> {
    const seqExists = await this.sequelize.query(
      `SELECT 1
       FROM information_schema.sequences
       where sequence_schema = 'public'
         and sequence_name = 'subquery_schema_seq'`,
      {
        type: QueryTypes.SELECT,
      },
    );
    if (!seqExists.length) {
      await this.sequelize.query(
        `CREATE SEQUENCE subquery_schema_seq as integer START 1;`,
        { type: QueryTypes.RAW },
      );
    }
    const [{ nextval }] = await this.sequelize.query(
      `SELECT nextval('subquery_schema_seq')`,
      {
        type: QueryTypes.SELECT,
      },
    );
    return Number(nextval);
  }
}
