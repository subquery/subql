// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import { Injectable } from '@nestjs/common';
import { validateSemver } from '@subql/common';
import {
  CosmosProjectNetworkConfig,
  parseCosmosProjectManifest,
  SubqlCosmosDataSource,
  ProjectManifestV1_0_0Impl,
  isRuntimeCosmosDs,
  isCustomCosmosDs,
} from '@subql/common-cosmos';
import {
  insertBlockFiltersCronSchedules,
  ISubqueryProject,
  loadProjectTemplates,
  SubqlProjectDs,
  updateDataSourcesV1_0_0,
} from '@subql/node-core';
import { ParentProject, Reader, RunnerSpecs } from '@subql/types-core';
import {
  CustomDatasourceTemplate,
  RuntimeDatasourceTemplate,
  SubqlCosmosHandlerKind,
} from '@subql/types-cosmos';
import { buildSchemaFromString } from '@subql/utils';
import Cron from 'cron-converter';
import { GraphQLSchema } from 'graphql';
import { processNetworkConfig } from '../utils/project';

const { version: packageVersion } = require('../../package.json');

export type CosmosProjectDs = SubqlProjectDs<SubqlCosmosDataSource>;

export type CosmosProjectDsTemplate =
  | SubqlProjectDs<RuntimeDatasourceTemplate>
  | SubqlProjectDs<CustomDatasourceTemplate>;

const NOT_SUPPORT = (name: string) => {
  throw new Error(`Manifest specVersion ${name} is not supported`);
};

// This is the runtime type after we have mapped genesisHash to chainId and endpoint/dict have been provided when dealing with deployments
type NetworkConfig = CosmosProjectNetworkConfig & { chainId: string };

@Injectable()
export class SubqueryProject implements ISubqueryProject {
  #dataSources: CosmosProjectDs[];

  constructor(
    readonly id: string,
    readonly root: string,
    readonly network: NetworkConfig,
    dataSources: CosmosProjectDs[],
    readonly schema: GraphQLSchema,
    readonly templates: CosmosProjectDsTemplate[],
    readonly runner?: RunnerSpecs,
    readonly parent?: ParentProject,
  ) {
    this.#dataSources = dataSources;
  }

  get dataSources(): CosmosProjectDs[] {
    return this.#dataSources;
  }

  async applyCronTimestamps(
    getTimestamp: (height: number) => Promise<Date>,
  ): Promise<void> {
    this.#dataSources = await insertBlockFiltersCronSchedules(
      this.dataSources,
      getTimestamp,
      isRuntimeCosmosDs,
      SubqlCosmosHandlerKind.Block,
    );
  }

  static async create(
    path: string,
    rawManifest: unknown,
    reader: Reader,
    root: string,
    networkOverrides?: Partial<CosmosProjectNetworkConfig>,
  ): Promise<SubqueryProject> {
    // rawManifest and reader can be reused here.
    // It has been pre-fetched and used for rebase manifest runner options with args
    // in order to generate correct configs.

    // But we still need reader here, because path can be remote or local
    // and the `loadProjectManifest(projectPath)` only support local mode
    if (rawManifest === undefined) {
      throw new Error(`Get manifest from project path ${path} failed`);
    }

    const manifest = parseCosmosProjectManifest(rawManifest);

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

type SUPPORT_MANIFEST = ProjectManifestV1_0_0Impl;

async function loadProjectFromManifestBase(
  projectManifest: SUPPORT_MANIFEST,
  reader: Reader,
  path: string,
  root: string,
  networkOverrides?: Partial<CosmosProjectNetworkConfig>,
): Promise<SubqueryProject> {
  if (typeof projectManifest.network.endpoint === 'string') {
    projectManifest.network.endpoint = [projectManifest.network.endpoint];
  }

  const network = await processNetworkConfig(
    {
      ...projectManifest.network,
      ...networkOverrides,
    },
    reader,
  );

  if (!network.endpoint) {
    throw new Error(
      `Network endpoint must be provided for network. chainId="${network.chainId}"`,
    );
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

  const dataSources = await updateDataSourcesV1_0_0(
    projectManifest.dataSources,
    reader,
    root,
    isCustomCosmosDs,
  );

  const templates = await loadProjectTemplates(
    projectManifest.templates,
    root,
    reader,
    isCustomCosmosDs,
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
    runner,
    projectManifest.parent,
  );
}
