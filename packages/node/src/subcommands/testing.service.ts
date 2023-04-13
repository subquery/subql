// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

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
import { SubqlTest } from '@subql/testing/interfaces';
import { DynamicDatasourceCreator, Store } from '@subql/types';
import { getAllEntitiesRelations } from '@subql/utils';
import chalk from 'chalk';
import Pino from 'pino';
import { CreationAttributes, Model, Sequelize } from 'sequelize';
import { SubqlProjectDs, SubqueryProject } from '../configure/SubqueryProject';
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
  private tests: Record<number, SubqlTest[]> = {};
  private testSandboxes: TestSandbox[];
  private failedTestsSummary: {
    testName: string;
    entityId: string;
    failedAttributes: string[];
  }[] = [];

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
    await this.indexerManager.start();
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

    this.testSandboxes.map((sandbox, index) => {
      this.tests[index] = sandbox.getTests();
    });
  }

  async run() {
    if (Object.keys(this.tests).length !== 0) {
      for (const sandboxIndex in this.tests) {
        const tests = this.tests[sandboxIndex];
        for (const test of tests) {
          await this.runTest(test, this.testSandboxes[sandboxIndex]);
        }
      }
    }

    this.logFailedTestsSummary();
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

    // Init entities
    logger.debug('Initializing entities');
    test.dependentEntities.map(async (entity) => {
      await entity.save();
    });

    const runtimeVersion = await this.apiService
      .getApi()
      .rpc.state.getRuntimeVersion(block.block.block.header.hash);

    logger.debug('Running handler');
    await this.indexerManager.indexBlock(
      block,
      runtimeVersion,
      (datasources: SubqlProjectDs[]) => {
        for (const ds of datasources) {
          // Create a deep copy of the ds object
          const dsCopy = JSON.parse(JSON.stringify(ds));

          const mapping = dsCopy.mapping;
          const handlers = mapping.handlers;

          //logger.info(JSON.stringify(test.handler))
          for (let i = 0; i < handlers.length; i++) {
            if (handlers[i].handler === test.handler) {
              mapping.handlers = [handlers[i] as any];
              return [dsCopy];
            }
          }

          return [];
        }
      },
    );

    // Check expected entities
    logger.debug('Checking expected entities');
    let passedTests = 0;
    let failedTests = 0;
    for (let i = 0; i < test.expectedEntities.length; i++) {
      const expectedEntity = test.expectedEntities[i];
      const actualEntity = await store.get(
        expectedEntity._name,
        expectedEntity.id,
      );
      const attributes = actualEntity as unknown as CreationAttributes<Model>;
      const failedAttributes: string[] = [];
      let passed = true;
      Object.keys(attributes).map((attr) => {
        if (!this.isEqual(expectedEntity[attr], actualEntity[attr])) {
          passed = false;
          failedAttributes.push(
            `Attribute "${attr}": expected "${expectedEntity[attr]}", got "${actualEntity[attr]}"`,
          );
        }
      });

      if (passed) {
        logger.info(`Entity check PASSED (Entity ID: ${expectedEntity.id})`);
        passedTests++;
      } else {
        logger.warn(`Entity check FAILED (Entity ID: ${expectedEntity.id})`);
        this.failedTestsSummary.push({
          testName: test.name,
          entityId: expectedEntity.id,
          failedAttributes: failedAttributes,
        });

        failedTests++;
      }
    }

    logger.info(
      `Test: ${test.name} completed with ${chalk.green(
        `${passedTests} passed`,
      )} and ${chalk.red(`${failedTests} failed`)} checks`,
    );
    await this.sequelize.dropSchema(`"${schema}"`, {
      logging: false,
      benchmark: false,
    });
  }

  private isEqual(expected: any, actual: any): boolean {
    if (expected instanceof Date && actual instanceof Date) {
      return expected.getTime() === actual.getTime();
    }
    return expected === actual;
  }

  private logFailedTestsSummary() {
    if (this.failedTestsSummary.length > 0) {
      logger.warn(chalk.bold.underline.yellow('Failed tests summary:'));
      for (const failedTest of this.failedTestsSummary) {
        logger.warn(
          chalk.bold.red(
            `Test: ${failedTest.testName} - Entity ID: ${failedTest.entityId}`,
          ),
        );
        for (const attr of failedTest.failedAttributes) {
          logger.warn(chalk.red(`  ${attr}`));
        }
      }
    }
  }
}
