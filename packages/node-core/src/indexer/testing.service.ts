// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {existsSync, readdirSync, statSync} from 'fs';
import path from 'path';
import {Injectable} from '@nestjs/common';
import {BaseDataSource} from '@subql/common';
import {SubqlTest} from '@subql/testing/interfaces';
import chalk from 'chalk';
import {IApi} from '../api.service';
import {NodeConfig} from '../configure';
import {getLogger} from '../logger';
import {SandboxOption, TestSandbox} from './sandbox';
import {TestRunner} from './test.runner';
import {IIndexerManager, ISubqueryProject} from './types';

const logger = getLogger('subql-testing');

@Injectable()
export abstract class TestingService<A, SA, B, DS extends BaseDataSource> {
  private tests: Record<number, SubqlTest[]> = {};
  private testSandboxes: TestSandbox[];
  private failedTestsSummary: {
    testName: string;
    entityId?: string;
    entityName?: string;
    failedAttributes: string[];
  }[] = [];

  private totalTests = 0;
  private totalPassedTests = 0;
  private totalFailedTests = 0;

  constructor(protected nodeConfig: NodeConfig, protected project: ISubqueryProject) {
    const projectPath = this.project.root;
    // find all paths to test files
    const testFiles = this.findAllTestFiles(path.join(projectPath, 'dist'));

    // import all test files
    this.testSandboxes = testFiles.map((file) => {
      const option: SandboxOption = {
        root: this.project.root,
        entry: file,
        chainId: this.project.network.chainId,
      };

      return new TestSandbox(option, this.nodeConfig);
    });
  }

  abstract getTestRunner(): Promise<TestRunner<A, SA, B, DS>>; // TestRunner will be create with a new app instance

  async indexBlock(
    block: B,
    handler: string,
    indexerManager: IIndexerManager<B, DS>,
    apiService?: IApi<A, SA, B>
  ): Promise<void> {
    await indexerManager.indexBlock(block, this.getDsWithHandler(handler));
  }

  async init() {
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
        this.totalTests += tests.length;
        for (const test of tests) {
          await this.runTest(test, this.testSandboxes[sandboxIndex]);
        }
      }
      this.logFailedTestsSummary();
    } else {
      const docsUrl = 'https://academy.subquery.network/build/testingframework.html';
      logger.warn(
        `No tests found. Please refer to the documentation for guidance on creating and running tests: ${docsUrl}`
      );
    }
  }

  private findAllTestFiles(dirPath: string): string[] {
    const files: string[] = [];

    if (!existsSync(dirPath)) {
      return [];
    }

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

    const testRunner = await this.getTestRunner();

    const {failedTestSummary, failedTests, passedTests} = await testRunner.runTest(
      test,
      sandbox,
      this.indexBlock.bind(this)
    );

    failedTests > 0 ? this.totalFailedTests++ : this.totalPassedTests++;

    if (failedTestSummary) {
      this.failedTestsSummary.push(failedTestSummary);
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
    }
    return [];
  }

  private logFailedTestsSummary() {
    if (this.failedTestsSummary.length > 0) {
      logger.warn(chalk.bold.underline.yellow('Failed tests summary:'));
      for (const failedTest of this.failedTestsSummary) {
        let testDetails =
          failedTest.entityName && failedTest.entityId
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
