// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Inject, Injectable} from '@nestjs/common';
import {SubqlTest} from '@subql/testing';
import {Sequelize} from '@subql/x-sequelize';
import chalk from 'chalk';
import {isEqual} from 'lodash';
import {IApi} from '../api.service';
import {NodeConfig} from '../configure/NodeConfig';
import {getLogger} from '../logger';
import {TestSandbox} from './sandbox';
import {StoreService} from './store.service';
import {IBlock, IIndexerManager} from './types';

const logger = getLogger('test-runner');

export interface FailedTestSummary {
  testName: string;
  entityId: string | undefined;
  entityName: string | undefined;
  failedAttributes: string[];
}

@Injectable()
export class TestRunner<A, SA, B, DS> {
  private failedTestSummary: FailedTestSummary | undefined;
  private passedTests = 0;
  private failedTests = 0;
  constructor(
    @Inject('IApi') protected readonly apiService: IApi<A, SA, IBlock<B>[]>,
    protected readonly storeService: StoreService,
    protected readonly sequelize: Sequelize,
    protected readonly nodeConfig: NodeConfig,
    @Inject('IIndexerManager') protected readonly indexerManager: IIndexerManager<B, DS>
  ) {}

  async runTest(
    test: SubqlTest,
    sandbox: TestSandbox,
    indexBlock: (
      block: IBlock<B>,
      handler: string,
      indexerManager: IIndexerManager<B, DS>,
      apiService?: IApi<A, SA, IBlock<B>[]>
    ) => Promise<void>
  ): Promise<{
    passedTests: number;
    failedTests: number;
    failedTestSummary: FailedTestSummary | undefined;
  }> {
    const schema = this.nodeConfig.dbSchema;

    try {
      // Fetch block
      logger.debug('Fetching block');
      const [block] = await this.apiService.fetchBlocks([test.blockHeight]);

      this.storeService.setBlockHeight(test.blockHeight);
      const store = this.storeService.getStore();
      sandbox.freeze(store, 'store');

      // Init entities
      logger.debug('Initializing entities');
      await Promise.all(test.dependentEntities.map((entity) => entity.save?.()));

      logger.debug('Running handler');

      try {
        await indexBlock(block, test.handler, this.indexerManager, this.apiService);
        await this.storeService.storeCache.flushCache(true);
      } catch (e: any) {
        logger.warn(`Test: ${test.name} field due to runtime error`, e);
        this.failedTestSummary = {
          testName: test.name,
          entityId: undefined,
          entityName: undefined,
          failedAttributes: [`Runtime Error:\n${e.stack}`],
        };

        this.failedTests++;
        throw e;
      }

      // Check expected entities
      logger.debug('Checking expected entities');

      for (let i = 0; i < test.expectedEntities.length; i++) {
        const expectedEntity = test.expectedEntities[i];
        //eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const actualEntity = await store.get(expectedEntity._name!, expectedEntity.id);

        const failedAttributes: string[] = [];
        if (!actualEntity) {
          failedAttributes.push(`\t\tExpected entity was not found`);
        } else {
          Object.keys(actualEntity).forEach((attr) => {
            // EntityClass has private store on it, don't need to check it.
            if (attr === 'store') return;

            const expectedAttr = (expectedEntity as Record<string, any>)[attr] ?? null;
            const actualAttr = (actualEntity as Record<string, any>)[attr] ?? null;

            if (!isEqual(expectedAttr, actualAttr)) {
              // Converts dates into a format so that ms is visible
              const fmtValue = (value: any) => {
                if (value instanceof Date) {
                  return value.toISOString();
                }
                return value;
              };
              failedAttributes.push(
                `\t\tattribute: "${attr}":\n\t\t\texpected: "${fmtValue(expectedAttr)}"\n\t\t\tactual:   "${fmtValue(actualAttr)}"\n`
              );
            }
          });
        }

        if (!failedAttributes.length) {
          logger.info(`Entity check PASSED (Entity ID: ${expectedEntity.id})`);
          this.passedTests++;
        } else {
          logger.warn(`Entity check FAILED (Entity ID: ${expectedEntity.id})`);
          this.failedTestSummary = {
            testName: test.name,
            entityId: expectedEntity.id,
            entityName: expectedEntity._name,
            failedAttributes: failedAttributes,
          };

          this.failedTests++;
        }
      }

      await this.storeService.storeCache.flushCache(true);
      logger.info(
        `Test: ${test.name} completed with ${chalk.green(`${this.passedTests} passed`)} and ${chalk.red(
          `${this.failedTests} failed`
        )} checks`
      );
    } catch (e: any) {
      this.failedTests += test.expectedEntities.length;
      logger.warn(e, `Test ${test.name} failed to run`);
    } finally {
      await this.sequelize.dropSchema(`"${schema}"`, {
        logging: false,
        benchmark: false,
      });
    }

    return {
      passedTests: this.passedTests,
      failedTests: this.failedTests,
      failedTestSummary: this.failedTestSummary,
    };
  }
}
