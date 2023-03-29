// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { assert } from 'console';
import { readdirSync, statSync } from 'fs';
import path from 'path';
import { Inject, Injectable } from '@nestjs/common';
import { NodeConfig, StoreService, getLogger } from '@subql/node-core';
import { HandlerFunction } from '@subql/testing';
import {
  DynamicDatasourceCreator,
  Entity,
  Store,
  SubstrateHandlerKind,
} from '@subql/types';
import { getAllEntitiesRelations } from '@subql/utils';
import Pino from 'pino';
import { CreationAttributes, Model, Options, Sequelize } from 'sequelize';
import { register, RegisterOptions } from 'ts-node';
import { SubqueryProject } from '../configure/SubqueryProject';
import { ApiService } from '../indexer/api.service';
import { IndexerManager } from '../indexer/indexer.manager';
import * as SubstrateUtil from '../utils/substrate';

const logger = getLogger('CLI-Testing');

declare global {
  //const api: ApiAt;
  const logger: Pino.Logger;
  const store: Store;
  const createDynamicDatasource: DynamicDatasourceCreator;
}

@Injectable()
export class TestingService {
  constructor(
    private readonly sequelize: Sequelize,
    private readonly nodeConfig: NodeConfig,
    private readonly storeService: StoreService,
    @Inject('ISubqueryProject') private project: SubqueryProject,
    private readonly apiService: ApiService,
    private readonly indexerManager: IndexerManager,
  ) {}

  // eslint-disable-next-line @typescript-eslint/require-await
  async init() {
    const projectPath = this.project.root;
    // find all paths to test files
    const testFiles = this.findAllTestFiles(path.join(projectPath, 'src/test'));
    // import all test files

    const { compilerOptions } = require(path.join(
      projectPath,
      'tsconfig.json',
    ));

    const options: RegisterOptions = {
      compilerOptions,
      files: true,
    };

    register(options);

    const tests = testFiles.map((file) => require(file));

    logger.info(`Found ${tests.length} tests`);
  }

  async run() {
    if ((global as any).subqlTests) {
      await Promise.all(
        (global as any).subqlTests.map(async (test) => {
          await this.runTest(test);
        }),
      );
    }
  }

  private findAllTestFiles(dirPath: string): string[] {
    const files: string[] = [];

    readdirSync(dirPath).forEach((file) => {
      const filePath = path.join(dirPath, file);
      const stat = statSync(filePath);

      if (stat.isDirectory()) {
        files.push(...this.findAllTestFiles(filePath));
      } else if (filePath.endsWith('.test.ts')) {
        files.push(filePath);
      }
    });

    return files;
  }

  private async runTest(test: {
    name: string;
    blockHeight: number;
    dependentEntities: Entity[];
    expectedEntities: Entity[];
    handler: HandlerFunction;
    handlerKind: SubstrateHandlerKind;
  }) {
    // Fetch block
    //TODO: this should be used made general for all networks.
    // create a mapping to get the right fetch function based on the network?
    const [block] = await SubstrateUtil.fetchBlocksBatches(
      this.apiService.getApi(),
      [test.blockHeight],
    );

    // Check filters match

    // Init db
    const modelRelations = getAllEntitiesRelations(this.project.schema);
    for (let i = 0; i < modelRelations.models.length; i++) {
      modelRelations.models[i].name = `${modelRelations.models[i].name}`;
    }
    await this.storeService.init(modelRelations, this.nodeConfig.subqueryName);

    const store = this.storeService.getStore();
    (global as any).store = store;

    // Init entities
    test.dependentEntities.map(async (entity) => {
      const attrs = entity as unknown as CreationAttributes<Model>;
      logger.info(JSON.stringify(attrs));
      await (global as any).store.set(`${entity.name}`, entity.id, entity);
    });

    // Run handler
    switch (test.handlerKind) {
      case SubstrateHandlerKind.Block:
        await test.handler(block.block);
        break;
      case SubstrateHandlerKind.Call:
        block.extrinsics.map((ext) => test.handler(ext));
        break;
      case SubstrateHandlerKind.Event:
        block.events.map((evt) => test.handler(evt));
        break;
      default:
    }

    // Check expected entities
    for (let i = 0; i < test.expectedEntities.length; i++) {
      const expectedEntity = test.expectedEntities[i];
      const actualEntity = await store.get(
        `${expectedEntity.name}`,
        expectedEntity.id,
      );
      const attributes = actualEntity as unknown as CreationAttributes<Model>;
      Object.keys(attributes).map((attr) =>
        assert(
          expectedEntity[attr] === actualEntity[attr],
          `AssertionFailedError on ${expectedEntity.name}.${attr}: expected: ${expectedEntity[attr]}, actual: ${actualEntity[attr]}`,
        ),
      );
    }
  }
}
