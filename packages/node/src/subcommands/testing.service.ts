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
  IndexerSandbox,
} from '@subql/node-core';
import { SubqlTest } from '@subql/testing/interfaces';
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
  private tests: SubqlTest[];
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
    const testFiles = this.findAllTestFiles(
      path.join(projectPath, 'dist/test'),
    );
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

    const sandboxes: TestSandbox[] = testFiles.map((file) => {
      const option: SandboxOption = {
        root: this.project.root,
        entry: file,
        script: null,
      };

      return new TestSandbox(option, this.nodeConfig);
    });

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
      } else if (filePath.endsWith('.test.js')) {
        files.push(filePath);
      }
    });

    return files;
  }

  private async runTest(test: SubqlTest) {
    // Fetch block

    const [block] = await SubstrateUtil.fetchBlocksBatches(
      this.apiService.getApi(),
      [test.blockHeight],
    );

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
      logger.info(entity.constructor.name);
      await store.set(`${(entity as any).name}`, entity.id, entity);
    });

    const handlerInfo = this.getHandlerInfo(test.handler);

    const sandbox = new IndexerSandbox(
      {
        root: this.project.root,
        entry: handlerInfo.entry,
        script: undefined,
      },
      this.nodeConfig,
    );

    sandbox.freeze(store, 'store');

    // Run handler
    switch (handlerInfo.kind) {
      case SubstrateHandlerKind.Block:
        await sandbox.securedExec(handlerInfo.handler, [block.block]);
        break;
      case SubstrateHandlerKind.Call:
        await Promise.all(
          block.extrinsics.map(async (ext) => {
            await sandbox.securedExec(handlerInfo.handler, [ext]);
          }),
        );
        break;
      case SubstrateHandlerKind.Event:
        await Promise.all(
          block.events.map(async (evt) => {
            await sandbox.securedExec(handlerInfo.handler, [evt]);
          }),
        );
        break;
      default:
    }

    // Check expected entities
    for (let i = 0; i < test.expectedEntities.length; i++) {
      const expectedEntity = test.expectedEntities[i];
      const actualEntity = await store.get(
        `${(expectedEntity as any).name}`,
        expectedEntity.id,
      );
      const attributes = actualEntity as unknown as CreationAttributes<Model>;
      let passed = true;
      Object.keys(attributes).map((attr) => {
        if (expectedEntity[attr] !== actualEntity[attr]) {
          passed = false;
        }
      });

      if (passed) {
        logger.info(`Test: ${test.name} PASSED`);
      } else {
        logger.warn(`Test: ${test.name} FAILED`);
      }
    }

    this.sequelize.dropSchema(schema, {
      logging: false,
      benchmark: false,
    });
  }

  private getHandlerInfo(handler: string): {
    handler: string;
    entry: string;
    kind: string;
  } {
    const datasources = this.project.dataSources;
    for (const ds of datasources) {
      const mapping = ds.mapping;
      const handlers = mapping.handlers;
      for (const hnd of handlers) {
        if (hnd.handler === handler) {
          return {
            handler: handler,
            entry: mapping.file,
            kind: hnd.kind,
          };
        }
      }
    }
    throw new Error(`handler ${handler} not found in the mappings`);
  }
}
