// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { readdirSync, statSync } from 'fs';
import path from 'path';
import { Inject, Injectable } from '@nestjs/common';
import { RuntimeVersion } from '@polkadot/types/interfaces';
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
  Store,
  SubstrateBlock,
  SubstrateHandlerKind,
} from '@subql/types';
import { getAllEntitiesRelations } from '@subql/utils';
import Pino from 'pino';
import { CreationAttributes, Model, Options, Sequelize } from 'sequelize';
import { SubqlProjectDs, SubqueryProject } from '../configure/SubqueryProject';
import { ApiService } from '../indexer/api.service';
import { IndexerManager } from '../indexer/indexer.manager';
import { SandboxService } from '../indexer/sandbox.service';
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
  private testSandboxes: TestSandbox[];

  constructor(
    private readonly sequelize: Sequelize,
    private readonly nodeConfig: NodeConfig,
    private readonly storeService: StoreService,
    @Inject('ISubqueryProject') private project: SubqueryProject,
    private readonly apiService: ApiService,
    private readonly indexerManager: IndexerManager,
    private readonly sandboxService: SandboxService,
  ) {}

  // eslint-disable-next-line @typescript-eslint/require-await
  async init() {
    const projectPath = this.project.root;
    // find all paths to test files
    const testFiles = this.findAllTestFiles(
      path.join(projectPath, 'dist/test'),
    );
    // import all test files

    this.testSandboxes = testFiles.map((file) => {
      const option: SandboxOption = {
        root: this.project.root,
        entry: file,
        script: null,
      };

      return new TestSandbox(option, this.nodeConfig);
    });

    logger.info(`Found ${this.testSandboxes.length} test files`);

    await Promise.all(
      this.testSandboxes.map(async (sandbox) => {
        await sandbox.runTimeout(1000);
      }),
    );

    this.tests = [];
    this.testSandboxes.map((sandbox) => {
      this.tests.push(...sandbox.getTests());
    });
  }

  async run() {
    if (this.tests?.length !== 0) {
      await Promise.all(
        this.tests.map(async (test, index) => {
          await this.runTest(test, this.testSandboxes[index]);
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

  private async runTest(test: SubqlTest, sandbox: TestSandbox) {
    logger.info(`Starting test: ${test.name}`);

    const handlerInfo = this.getHandlerInfo(test.handler);

    // Fetch block
    logger.debug('Fetching block');
    const [block] = await SubstrateUtil.fetchBlocksBatches(
      this.apiService.getApi(),
      [test.blockHeight],
    );

    // Init db
    const schema = `test-${this.nodeConfig.subqueryName}`;

    const schemas = await this.sequelize.showAllSchemas(undefined);
    if (!(schemas as unknown as string[]).includes(schema)) {
      await this.sequelize.createSchema(`"${schema}"`, undefined);
    }

    const modelRelations = getAllEntitiesRelations(this.project.schema);
    await this.storeService.init(modelRelations, schema);
    const store = this.storeService.getStore();
    sandbox.freeze(store, 'store');

    logger.info(JSON.stringify(test.dependentEntities));

    // Init entities
    logger.debug('Initializing entities');
    test.dependentEntities.map(async (entity) => {
      logger.info(JSON.stringify(entity.save));
      await entity.save();
    });

    const dataSource: SubqlProjectDs = this.getDsWithHandler(test.handler);
    const runtimeVersion = await this.apiService
      .getApi()
      .rpc.state.getRuntimeVersion(block.block.block.header.hash);

    logger.debug('Running handler');
    switch (handlerInfo.kind) {
      case SubstrateHandlerKind.Block:
        await this.indexerManager.indexData<SubstrateHandlerKind.Block>(
          SubstrateHandlerKind.Block,
          block.block,
          dataSource,
          this.getVM(block.block, runtimeVersion),
        );
        break;
      case SubstrateHandlerKind.Call:
        await Promise.all(
          block.extrinsics.map(async (extrinsic) => {
            await this.indexerManager.indexData<SubstrateHandlerKind.Call>(
              SubstrateHandlerKind.Call,
              extrinsic,
              dataSource,
              this.getVM(block.block, runtimeVersion),
            );
          }),
        );
        break;
      case SubstrateHandlerKind.Event:
        await Promise.all(
          block.events.map(async (event) => {
            await this.indexerManager.indexData<SubstrateHandlerKind.Event>(
              SubstrateHandlerKind.Event,
              event,
              dataSource,
              this.getVM(block.block, runtimeVersion),
            );
          }),
        );
        break;
      default:
    }
    // Check expected entities
    logger.debug('Checking expected entities');
    let passedTests = 0;
    let failedTests = 0;
    for (let i = 0; i < test.expectedEntities.length; i++) {
      const expectedEntity = test.expectedEntities[i];
      const actualEntity = await store.get(
        (expectedEntity as any).name,
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
        logger.info(`Entity check PASSED (Entity ID: ${expectedEntity.id})`);
        passedTests++;
      } else {
        logger.warn(`Entity check FAILED (Entity ID: ${expectedEntity.id})`);
        failedTests++;
      }
    }

    logger.info(
      `Test: ${test.name} completed with ${passedTests} passed and ${failedTests} failed checks`,
    );

    this.sequelize.dropSchema(schema, {
      logging: false,
      benchmark: false,
    });
  }

  private getDsWithHandler(handler: string) {
    //return datasource with the given handler
    const datasources = this.project.dataSources;
    for (const ds of datasources) {
      const mapping = ds.mapping;
      const handlers = mapping.handlers;
      for (const hnd of handlers) {
        if (hnd.handler === handler) {
          return ds;
        }
      }
    }
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

  private getVM(
    block: SubstrateBlock,
    runtimeVersion: RuntimeVersion,
  ): (ds: SubqlProjectDs) => Promise<IndexerSandbox> {
    return async (ds: SubqlProjectDs) => {
      // Injected runtimeVersion from fetch service might be outdated
      const apiAt = await this.apiService.getPatchedApi(block, runtimeVersion);

      const vm = this.sandboxService.getDsProcessor(ds, apiAt);

      return vm;
    };
  }
}
