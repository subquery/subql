// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

// Utils for integration tests

import { DynamicModule, INestApplication } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { Test } from '@nestjs/testing';
import {
  CoreModule,
  DbModule,
  HistoricalMode,
  NodeConfig,
  registerApp,
} from '@subql/node-core';
import { ConfigureModule } from '../configure/configure.module';
import {
  createSubQueryProject,
  SubqueryProject,
} from '../configure/SubqueryProject';
import { FetchModule } from '../indexer/fetch.module';

const mockInstance = async (
  cid: string,
  schemaName: string,
  historical: HistoricalMode,
  useSubscription: boolean,
  timestampField: boolean,
) => {
  const argv: Record<string, any> = {
    _: [],
    historical,
    subquery: `ipfs://${cid}`,
    dbSchema: schemaName,
    allowSchemaMigration: true,
    ipfs: 'https://unauthipfs.subquery.network/ipfs/api/v0',
    networkEndpoint: 'https://rpc.polkadot.io/public',
    timestampField,
    subscription: useSubscription,
    // unfinalizedBlocks: false,
  };
  return registerApp<SubqueryProject>(
    argv,
    createSubQueryProject,
    () => {}, //jest.fn(),
    '',
  );
};

async function mockRegister(
  cid: string,
  schemaName: string,
  historical: HistoricalMode,
  useSubscription: boolean,
  timestampField: boolean,
): Promise<DynamicModule> {
  const { nodeConfig, project } = await mockInstance(
    cid,
    schemaName,
    historical,
    useSubscription,
    timestampField,
  );

  return {
    module: ConfigureModule,
    providers: [
      {
        provide: NodeConfig,
        useValue: nodeConfig,
      },
      {
        provide: 'ISubqueryProject',
        useValue: project,
      },
      {
        provide: 'IProjectUpgradeService',
        useValue: project,
      },
      {
        provide: 'Null',
        useValue: null,
      },
    ],
    exports: [NodeConfig, 'ISubqueryProject', 'IProjectUpgradeService', 'Null'],
  };
}

export async function prepareApp(
  schemaName: string,
  cid: string,
  disableHistorical = false,
  useSubscription = false,
  timestampField = false,
): Promise<INestApplication> {
  const m = await Test.createTestingModule({
    imports: [
      DbModule.forRoot(),
      EventEmitterModule.forRoot(),
      mockRegister(
        cid,
        schemaName,
        disableHistorical ? false : 'height',
        useSubscription,
        timestampField,
      ),
      ScheduleModule.forRoot(),
      CoreModule,
      FetchModule,
    ],
    controllers: [],
  }).compile();

  const app = m.createNestApplication();
  await app.init();
  return app;
}
