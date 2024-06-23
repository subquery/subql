// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {INetworkCommonModule} from '@subql/types-core';
import {Data} from 'ejs';
import {SubqlRuntimeDatasource} from './project';

export interface EthereumNetworkModule extends INetworkCommonModule {
  generateAbis?(
    datasources: SubqlRuntimeDatasource[],
    projectPath: string,
    prepareDirPath: (path: string, recreate: boolean) => Promise<void>,
    renderTemplate: (templatePath: string, outputPath: string, templateData: Data) => Promise<void>
  ): Promise<void>;
  parseContractPath?(path: string): {name: string; rawName: string; path: string[]};
}
