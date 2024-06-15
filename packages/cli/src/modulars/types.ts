// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {NETWORK_FAMILY} from '@subql/common';
import {SubstrateDatasource} from '@subql/types';
import {AlgorandDataSource} from '@subql/types-algorand';
import {ConcordiumDatasource} from '@subql/types-concordium';
import {IProjectManifest} from '@subql/types-core';
import {
  CosmosChaintypes,
  CosmosCustomDatasource,
  CosmosDatasource,
  CosmosRuntimeDatasource,
  CustomModule,
} from '@subql/types-cosmos';
import {CosmosProjectManifestV1_0_0} from '@subql/types-cosmos/dist/project';
import {
  SubqlRuntimeDatasource,
  SubqlCustomDatasource,
  SubqlDatasource as EthSubqlDatasource,
} from '@subql/types-ethereum';
import {NearDatasource} from '@subql/types-near';
import {SubqlDatasource as StellarDatasource} from '@subql/types-stellar';

import {Data} from 'ejs';

export interface ModuleCache {
  [NETWORK_FAMILY.substrate]: {
    parseSubstrateProjectManifest(raw: unknown): IProjectManifest<SubstrateDatasource>;
    isCustomDs(ds: SubstrateDatasource): ds is SubqlCustomDatasource<string>;
  };
  [NETWORK_FAMILY.cosmos]: {
    parseCosmosProjectManifest(raw: unknown): IProjectManifest<ConcordiumDatasource>;
    generateProto(
      chaintypes: (CosmosChaintypes | Record<string, CustomModule>)[],
      projectPath: string,
      prepareDirPath: (path: string, recreate: boolean) => Promise<void>,
      renderTemplate: (templatePath: string, outputPath: string, templateData: Data) => Promise<void>,
      upperFirst: (string?: string) => string,
      /** @deprecated */
      mkdirProto?: (projectPath: string) => Promise<string>
    ): Promise<void>;
    generateCosmwasm(
      datasources: CosmosRuntimeDatasource[],
      projectPath: string,
      prepareDirPath: (path: string, recreate: boolean) => Promise<void>,
      upperFirst: (input?: string) => string,
      renderTemplate: (templatePath: string, outputPath: string, templateData: Data) => Promise<void>
    ): Promise<void>;
    validateCosmosManifest(manifest: unknown): manifest is CosmosProjectManifestV1_0_0;
    tempProtoDir(projectPath: string): Promise<string>;
    isCustomCosmosDs(ds: CosmosDatasource): ds is CosmosCustomDatasource<string>;
    isRuntimeCosmosDs(ds: CosmosDatasource): ds is CosmosRuntimeDatasource;
    CosmosCustomModuleImpl: CustomModule;
  };
  [NETWORK_FAMILY.algorand]: {
    parseAlgorandProjectManifest(raw: unknown): IProjectManifest<AlgorandDataSource>;
  };
  [NETWORK_FAMILY.ethereum]: {
    SubqlRuntimeHandler: any;
    EthereumDatasourceKind: {
      Runtime: string;
    };
    parseEthereumProjectManifest(raw: unknown): IProjectManifest<EthSubqlDatasource>;
    generateAbis(
      datasources: any[],
      projectPath: string,
      prepareDirPath: (path: string, recreate: boolean) => Promise<void>,
      upperFirst: (input?: string) => string,
      renderTemplate: (templatePath: string, outputPath: string, templateData: Data) => Promise<void>
    ): Promise<void>;
    isRuntimeDs(ds: EthSubqlDatasource): ds is SubqlRuntimeDatasource;
    isCustomDs(ds: EthSubqlDatasource): ds is SubqlCustomDatasource<string>;
    parseContractPath(contractPath: string): string;
  };
  [NETWORK_FAMILY.near]: {
    parseNearProjectManifest(raw: unknown): IProjectManifest<NearDatasource>;
  };
  [NETWORK_FAMILY.stellar]: {
    parseStellarProjectManifest(raw: unknown): IProjectManifest<StellarDatasource>;
  };
  [NETWORK_FAMILY.concordium]: {
    parseConcordiumProjectManifest(raw: unknown): IProjectManifest<ConcordiumDatasource>;
  };
}
