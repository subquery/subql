// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { assert } from 'console';
import { readdirSync, statSync } from 'fs';
import path from 'path';
import { Inject, Injectable } from '@nestjs/common';
import {
  NodeConfig,
  StoreService,
  getLogger,
  SandboxOption,
  TestSandbox,
} from '@subql/node-core';
import { HandlerFunction } from '@subql/testing';
import { subqlTest } from '@subql/testing/interfaces';
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

const logger = getLogger('CLI-test-Testing');

declare global {
  //const api: ApiAt;
  const logger: Pino.Logger;
  const store: Store;
  const createDynamicDatasource: DynamicDatasourceCreator;
}

@Injectable()
export class TestingService {
  private tests: subqlTest[];
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

    const sandboxes: TestSandbox[] = await Promise.all(
      testFiles.map(async (file) => {
        const option: SandboxOption = {
          root: this.project.root,
          entry: file,
          script: null,
        };

        return TestSandbox.create(option, this.nodeConfig);
      }),
    );

    logger.info(`Found ${sandboxes.length} test files`);

    await Promise.all(
      sandboxes.map(async (sandbox) => {
        await sandbox.runTimeout(1000);
      }),
    );

    this.tests = [];
    sandboxes.map((sandbox) => {
      this.tests.push(...sandbox.getTests());
    });
  }

  async run() {
    if (this.tests?.length !== 0) {
      await Promise.all(
        this.tests.map(async (test) => {
          await this.runTest(test as any);
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

    const [block] = await SubstrateUtil.fetchBlocksBatches(
      this.apiService.getApi(),
      [test.blockHeight],
    );
    logger.info(JSON.stringify(block));

    // Check filters match

    // Init db
    const schema = `test-${this.nodeConfig.subqueryName}`;

    const schemas = await this.sequelize.showAllSchemas(undefined);
    if (!(schemas as unknown as string[]).includes(schema)) {
      await this.sequelize.createSchema(`"${schema}"`, undefined);
    }

    const modelRelations = getAllEntitiesRelations(this.project.schema);
    await this.storeService.init(modelRelations, schema);
    const store = this.storeService.getStore();

    logger.info(JSON.stringify(test.dependentEntities));
    // Init entities
    test.dependentEntities.map(async (entity) => {
      const attrs = entity as unknown as CreationAttributes<Model>;
      logger.info(JSON.stringify(attrs));
      await store.set(`${entity.constructor.name}`, entity.id, entity);
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
        `${expectedEntity.constructor.name}`,
        expectedEntity.id,
      );
      const attributes = actualEntity as unknown as CreationAttributes<Model>;
      Object.keys(attributes).map((attr) =>
        assert(
          expectedEntity[attr] === actualEntity[attr],
          `AssertionFailedError on ${expectedEntity.constructor.name}.${attr}: expected: ${expectedEntity[attr]}, actual: ${actualEntity[attr]}`,
        ),
      );
    }

    this.sequelize.dropSchema(schema, {
      logging: false,
      benchmark: false,
    });
  }
}
