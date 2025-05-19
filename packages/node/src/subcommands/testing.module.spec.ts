// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import path from 'node:path';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { Test, TestingModule } from '@nestjs/testing';
import { LocalReader, ReaderFactory } from '@subql/common';
import { DbModule, NodeConfig } from '@subql/node-core';
import { ConfigureModule } from '../configure/configure.module';
import { createSubQueryProject } from '../configure/SubqueryProject';
import { TestingFeatureModule } from './testing.module';

describe('TestingModule', () => {
  let module: TestingModule;
  const nodeConfig = new NodeConfig({ subquery: 'test' } as any);

  afterEach(async () => {
    await module?.close();
  });

  it('should compile without error', async () => {
    const projectDirV1_0_0 = path.resolve(
      __dirname,
      '../../test/projectFixture/v1.0.0',
    );

    const reader = await ReaderFactory.create(projectDirV1_0_0);
    const rawManifest = await reader.getProjectSchema();
    const project = await createSubQueryProject(
      projectDirV1_0_0,
      rawManifest,
      reader,
      (reader as LocalReader).root,
      {
        endpoint: ['wss://moonriver.api.onfinality.io/public-ws'],
      },
    );
    module = await Test.createTestingModule({
      imports: [
        DbModule.forRoot(),
        ConfigureModule.registerManual(nodeConfig, project),
        EventEmitterModule.forRoot(),
        ScheduleModule.forRoot(),
        TestingFeatureModule,
      ],
    }).compile();

    expect(module).toBeDefined();
  }, 20_000);
});
