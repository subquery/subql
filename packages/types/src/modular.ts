// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {INetworkCommonModule} from '@subql/types-core';
import {Data} from 'ejs';
import type {Interface} from 'ethers/lib/utils';
import {SubqlCustomDatasource, SubqlDatasource, SubqlRuntimeDatasource} from './project';

export interface EthereumNetworkModule
  extends INetworkCommonModule<SubqlDatasource, SubqlRuntimeDatasource, SubqlCustomDatasource> {
  generateAbis(
    datasources: SubqlRuntimeDatasource[],
    projectPath: string,
    prepareDirPath: (path: string, recreate: boolean) => Promise<void>,
    upperFirst: (input?: string) => string,
    renderTemplate: (templatePath: string, outputPath: string, templateData: Data) => Promise<void>
  ): Promise<void>;
  parseContractPath(path: string): {name: string; rawName: string; path: string[]};
  getAbiInterface(projectPath: string, abiFileName: string): Interface;
}
