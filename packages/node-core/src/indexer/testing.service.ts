// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {readdirSync, statSync} from 'fs';
import path from 'path';
import {Inject, Injectable} from '@nestjs/common';
import {
  NodeConfig,
  StoreService,
  getLogger,
  SandboxOption,
  TestSandbox,
  IIndexerManager,
  ISubqueryProject,
} from '@subql/node-core';
import {SubqlTest} from '@subql/testing/interfaces';
import {DynamicDatasourceCreator, Store} from '@subql/types';
import {getAllEntitiesRelations} from '@subql/utils';
import chalk from 'chalk';
import {isEqual} from 'lodash';
import Pino from 'pino';
import {CreationAttributes, Model, Sequelize} from 'sequelize';
import {ApiService} from '../api.service';

const logger = getLogger('subql-testing');

declare global {
  //const api: ApiAt;
  const logger: Pino.Logger;
  const store: Store;
  const createDynamicDatasource: DynamicDatasourceCreator;
}

@Injectable()
export abstract class TestingService<B, DS> {
  private tests: Record<number, SubqlTest[]> = {};
  private testSandboxes: TestSandbox[];
  private failedTestsSummary: {
    testName: string;
    entityId: string;
    entityName: string;
    failedAttributes: string[];
  }[] = [];

  private totalTests = 0;
  private totalPassedTests = 0;
  private totalFailedTests = 0;

  constructor(
    protected readonly sequelize: Sequelize,
    protected readonly nodeConfig: NodeConfig,
    protected readonly storeService: StoreService,
    @Inject('ISubqueryProject') protected project: ISubqueryProject<any, DS>,
    protected readonly apiService: ApiService,
    protected readonly indexerManager: IIndexerManager<B, DS>
  ) {}

  abstract indexBlock(block: B, handler: string): Promise<void>;

  async init() {
    await this.indexerManager.start();
    const projectPath = this.project.root;
    // find all paths to test files
    const testFiles = this.findAllTestFiles(path.join(projectPath, 'dist/test'));

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
      this.testSandboxes.map(async (sandbox, index) => {
        this.tests[index] = await sandbox.getTests();
      })
    );
  }

  async run() {
    if (Object.keys(this.tests).length !== 0) {
      for (const sandboxIndex in this.tests) {
        const tests = this.tests[sandboxIndex];
        this.totalTests = tests.length;
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
    const schema = `test-${this.nodeConfig.subqueryName}`;

    try {
      // Fetch block
      logger.debug('Fetching block');
      const [block] = await this.apiService.fetchBlocks([test.blockHeight]);

      // Init db
      const schemas = await this.sequelize.showAllSchemas(undefined);
      if (!(schemas as unknown as string[]).includes(schema)) {
        await this.sequelize.createSchema(`"${schema}"`, undefined);
      }

      const modelRelations = getAllEntitiesRelations(this.project.schema);
      await this.storeService.init(modelRelations, schema);
      const tx = await this.sequelize.transaction();
      this.storeService.setTransaction(tx);
      const store = this.storeService.getStore();
      sandbox.freeze(store, 'store');

      // Init entities
      logger.debug('Initializing entities');
      await Promise.all(
        test.dependentEntities.map((entity) => {
          return entity.save();
        })
      );
      await tx.commit();

      logger.debug('Running handler');

      await this.indexBlock(block, test.handler);

      // Check expected entities
      logger.debug('Checking expected entities');
      let passedTests = 0;
      let failedTests = 0;
      for (let i = 0; i < test.expectedEntities.length; i++) {
        const expectedEntity = test.expectedEntities[i];
        const actualEntity = await store.get(expectedEntity._name, expectedEntity.id);
        const attributes = actualEntity as unknown as CreationAttributes<Model>;
        const failedAttributes: string[] = [];
        let passed = true;
        Object.keys(attributes).map((attr) => {
          const expectedAttr = (expectedEntity as Record<string, any>)[attr];
          const actualAttr = (actualEntity as Record<string, any>)[attr];
          if (!isEqual(expectedAttr, actualAttr)) {
            passed = false;
            failedAttributes.push(
              `\t\tattribute: "${attr}":\n\t\t\texpected: "${expectedAttr}"\n\t\t\tactual:   "${actualAttr}"`
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
            entityName: expectedEntity._name,
            failedAttributes: failedAttributes,
          });

          failedTests++;
        }
      }

      this.totalPassedTests += passedTests;
      this.totalFailedTests += failedTests;

      logger.info(
        `Test: ${test.name} completed with ${chalk.green(`${passedTests} passed`)} and ${chalk.red(
          `${failedTests} failed`
        )} checks`
      );
    } catch (e) {
      this.totalFailedTests += test.expectedEntities.length;
      logger.warn(`Test: ${test.name} field due to runtime error`, e);
      this.failedTestsSummary.push({
        testName: test.name,
        entityId: undefined,
        entityName: undefined,
        failedAttributes: [`Runtime Error:\n${e.stack}`],
      });
    } finally {
      await this.sequelize.dropSchema(`"${schema}"`, {
        logging: false,
        benchmark: false,
      });
    }
  }

  protected getDsWithHandler(handler: string): DS[] {
    for (const ds of this.project.dataSources) {
      // Create a deep copy of the ds object
      const dsCopy = JSON.parse(JSON.stringify(ds));

      const mapping = dsCopy.mapping;
      const handlers = mapping.handlers;

      for (let i = 0; i < handlers.length; i++) {
        if (handlers[i].handler === handler) {
          mapping.handlers = [handlers[i] as any];
          return [dsCopy];
        }
      }

      return [];
    }
  }

  private logFailedTestsSummary() {
    if (this.failedTestsSummary.length > 0) {
      logger.warn(chalk.bold.underline.yellow('Failed tests summary:'));
      for (const failedTest of this.failedTestsSummary) {
        let testDetails =
          failedTest.entityName || failedTest.entityId
            ? chalk.bold.red(`\n* ${failedTest.testName}\n\tEntity ${failedTest.entityName}: ${failedTest.entityId}\n`)
            : chalk.bold.red(`\n* ${failedTest.testName}\n`);
        for (const attr of failedTest.failedAttributes) {
          testDetails += chalk.red(attr);
        }
        logger.warn(testDetails);
      }
    }

    logger.info(chalk.bold.white(`Total tests: ${this.totalTests}`));
    logger.info(chalk.bold.green(`Passing tests: ${this.totalPassedTests}`));
    logger.info(chalk.bold.red(`Failing tests: ${this.totalFailedTests}`));
  }
}
