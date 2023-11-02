// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import { Injectable } from '@nestjs/common';
import { RegisteredTypes } from '@polkadot/types/types';
import { validateSemver } from '@subql/common';
import {
  parseSubstrateProjectManifest,
  ProjectManifestV1_0_0Impl,
  SubstrateBlockFilter,
  isRuntimeDs,
  SubstrateHandlerKind,
  isCustomDs,
} from '@subql/common-substrate';
import {
  insertBlockFiltersCronSchedules,
  loadProjectTemplates,
  SubqlProjectDs,
  updateDataSourcesV1_0_0,
  ISubqueryProject,
} from '@subql/node-core';
import {
  SubstrateDatasource,
  RuntimeDatasourceTemplate,
  CustomDatasourceTemplate,
  SubstrateNetworkConfig,
} from '@subql/types';
import { ParentProject, Reader, RunnerSpecs } from '@subql/types-core';
import { buildSchemaFromString } from '@subql/utils';
import axios from 'axios';
import Cron from 'cron-converter';
import { GraphQLSchema } from 'graphql';
import { getChainTypes } from '../utils/project';

const { version: packageVersion } = require('../../package.json');
const DICTIONARY_REGISTRY =
  'https://raw.githubusercontent.com/subquery/templates/main/dist/dictionary.json';

export type SubstrateProjectDs = SubqlProjectDs<SubstrateDatasource>;
export type SubqlProjectDsTemplate =
  | SubqlProjectDs<RuntimeDatasourceTemplate>
  | SubqlProjectDs<CustomDatasourceTemplate>;

export type SubqlProjectBlockFilter = SubstrateBlockFilter & {
  cronSchedule?: {
    schedule: Cron.Seeker;
    next: number;
  };
};

const NOT_SUPPORT = (name: string) => {
  throw new Error(`Manifest specVersion ${name} is not supported`);
};

@Injectable()
export class SubqueryProject implements ISubqueryProject {
  #dataSources: SubstrateProjectDs[];

  constructor(
    readonly id: string,
    readonly root: string,
    readonly network: SubstrateNetworkConfig,
    dataSources: SubstrateProjectDs[],
    readonly schema: GraphQLSchema,
    readonly templates: SubqlProjectDsTemplate[],
    readonly chainTypes?: RegisteredTypes,
    readonly runner?: RunnerSpecs,
    readonly parent?: ParentProject,
  ) {
    this.#dataSources = dataSources;
  }

  get dataSources(): SubstrateProjectDs[] {
    return this.#dataSources;
  }

  async applyCronTimestamps(
    getTimestamp: (height: number) => Promise<Date>,
  ): Promise<void> {
    this.#dataSources = await insertBlockFiltersCronSchedules(
      this.dataSources,
      getTimestamp,
      isRuntimeDs,
      SubstrateHandlerKind.Block,
    );
  }

  static async create(
    path: string,
    rawManifest: unknown,
    reader: Reader,
    root: string, // If project local then directory otherwise temp directory
    networkOverrides?: Partial<SubstrateNetworkConfig>,
  ): Promise<SubqueryProject> {
    // rawManifest and reader can be reused here.
    // It has been pre-fetched and used for rebase manifest runner options with args
    // in order to generate correct configs.

    // But we still need reader here, because path can be remote or local
    // and the `loadProjectManifest(projectPath)` only support local mode
    assert(
      rawManifest !== undefined,
      new Error(`Get manifest from project path ${path} failed`),
    );

    const manifest = parseSubstrateProjectManifest(rawManifest);

    if (!manifest.isV1_0_0) {
      NOT_SUPPORT('<1.0.0');
    }

    return loadProjectFromManifestBase(
      manifest.asV1_0_0,
      reader,
      path,
      root,
      networkOverrides,
    );
  }
}

function processChainId(network: any): SubstrateNetworkConfig {
  if (network.chainId && network.genesisHash) {
    throw new Error('Please only provide one of chainId and genesisHash');
  } else if (network.genesisHash && !network.chainId) {
    network.chainId = network.genesisHash;
  }
  delete network.genesisHash;
  return network;
}

type SUPPORT_MANIFEST = ProjectManifestV1_0_0Impl;

async function loadProjectFromManifestBase(
  projectManifest: SUPPORT_MANIFEST,
  reader: Reader,
  path: string,
  root: string,
  networkOverrides?: Partial<SubstrateNetworkConfig>,
): Promise<SubqueryProject> {
  if (typeof projectManifest.network.endpoint === 'string') {
    projectManifest.network.endpoint = [projectManifest.network.endpoint];
  }

  const network = processChainId({
    ...projectManifest.network,
    ...networkOverrides,
  });

  assert(
    network.endpoint,
    new Error(
      `Network endpoint must be provided for network. chainId="${network.chainId}"`,
    ),
  );

  if (!projectManifest.network.dictionary) {
    try {
      const response = await axios.get(DICTIONARY_REGISTRY);
      const dictionaryJson = response.data;

      const dictionaries =
        dictionaryJson.polkadot[projectManifest.network.chainId];

      if (Array.isArray(dictionaries) && dictionaries.length > 0) {
        projectManifest.network.dictionary = dictionaries[0];
      }
    } catch (error) {
      console.error('An error occurred while fetching the dictionary:', error);
    }
  }

  let schemaString: string;
  try {
    schemaString = await reader.getFile(projectManifest.schema.file);
  } catch (e) {
    throw new Error(
      `unable to fetch the schema from ${projectManifest.schema.file}`,
    );
  }
  const schema = buildSchemaFromString(schemaString);

  const chainTypes = projectManifest.network.chaintypes
    ? await getChainTypes(reader, root, projectManifest.network.chaintypes.file)
    : undefined;

  const dataSources = await updateDataSourcesV1_0_0(
    projectManifest.dataSources,
    reader,
    root,
    isCustomDs,
  );

  const templates = await loadProjectTemplates(
    projectManifest.templates,
    root,
    reader,
    isCustomDs,
  );
  const runner = projectManifest.runner;
  assert(
    validateSemver(packageVersion, runner.node.version),
    new Error(
      `Runner require node version ${runner.node.version}, current node ${packageVersion}`,
    ),
  );

  return new SubqueryProject(
    reader.root ? reader.root : path, //TODO, need to method to get project_id
    root,
    network,
    dataSources,
    schema,
    templates,
    chainTypes,
    runner,
    projectManifest.parent,
  );
}
