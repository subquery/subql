// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { DynamicModule, Global, Module } from '@nestjs/common';
import { NodeConfig, registerApp } from '@subql/node-core';
import { yargsOptions } from '../yargs';
import { createSubQueryProject, SubqueryProject } from './SubqueryProject';

const pjson = require('../../package.json');

@Global()
@Module({})
export class ConfigureModule {
  static async getInstance(): Promise<{
    nodeConfig: NodeConfig;
    project: SubqueryProject;
  }> {
    const { argv } = yargsOptions;
    return registerApp<SubqueryProject>(
      argv,
      createSubQueryProject,
      yargsOptions.showHelp.bind(yargsOptions),
      pjson,
    );
  }
  static async register(): Promise<DynamicModule> {
    const { nodeConfig, project } = await ConfigureModule.getInstance();

    return this.registerManual(nodeConfig, project);
  }
  // Used for testing where args/yargs cannot be used
  static registerManual(
    nodeConfig: NodeConfig,
    project: SubqueryProject,
  ): DynamicModule {
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
      exports: [
        NodeConfig,
        'ISubqueryProject',
        'IProjectUpgradeService',
        'Null',
      ],
    };
  }
}
