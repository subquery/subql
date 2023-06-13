// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Injectable } from '@nestjs/common';
import { ApiPromise } from '@polkadot/api';
import { RegisteredTypes } from '@polkadot/types/types';
import { Reader, RunnerSpecs, validateSemver } from '@subql/common';
import {
  SubstrateProjectNetworkConfig,
  parseSubstrateProjectManifest,
  ProjectManifestV1_0_0Impl,
  SubstrateBlockFilter,
  isRuntimeDs,
  SubstrateHandlerKind,
  isCustomDs,
  RuntimeDatasourceTemplate,
  CustomDatasourceTemplate,
} from '@subql/common-substrate';
import {
  getProjectRoot,
  insertBlockFiltersCronSchedules,
  ISubqueryProject,
  loadProjectTemplates,
  SubqlProjectDs,
  updateDataSourcesV1_0_0,
} from '@subql/node-core';
import { SubstrateDatasource } from '@subql/types';
import { buildSchemaFromString } from '@subql/utils';
import Cron from 'cron-converter';
import { GraphQLSchema } from 'graphql';
import { getChainTypes } from '../utils/project';
import { getBlockByHeight, getTimestamp } from '../utils/substrate';

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

// This is the runtime type after we have mapped genesisHash to chainId and endpoint/dict have been provided when dealing with deployments
type NetworkConfig = SubstrateProjectNetworkConfig & { chainId: string };

@Injectable()
export class SubqueryProject implements ISubqueryProject {
  id: string;
  root: string;
  network: NetworkConfig;
  dataSources: SubstrateProjectDs[];
  schema: GraphQLSchema;
  templates: SubqlProjectDsTemplate[];
  chainTypes?: RegisteredTypes;
  runner?: RunnerSpecs;

  static async create(
    path: string,
    rawManifest: unknown,
    reader: Reader,
    networkOverrides?: Partial<SubstrateProjectNetworkConfig>,
    root?: string,
  ): Promise<SubqueryProject> {
    // rawManifest and reader can be reused here.
    // It has been pre-fetched and used for rebase manifest runner options with args
    // in order to generate correct configs.

    // But we still need reader here, because path can be remote or local
    // and the `loadProjectManifest(projectPath)` only support local mode
    if (rawManifest === undefined) {
      throw new Error(`Get manifest from project path ${path} failed`);
    }

    const manifest = parseSubstrateProjectManifest(rawManifest);

    if (!manifest.isV1_0_0) {
      NOT_SUPPORT('<1.0.0');
    }

    return loadProjectFromManifest1_0_0(
      manifest.asV1_0_0,
      reader,
      path,
      networkOverrides,
      root,
    );
  }
}

function processChainId(network: any): NetworkConfig {
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
  networkOverrides?: Partial<SubstrateProjectNetworkConfig>,
  root?: string,
): Promise<SubqueryProject> {
  // Root is provided here only when running in a worker
  root = root ?? (await getProjectRoot(reader));

  if (typeof projectManifest.network.endpoint === 'string') {
    projectManifest.network.endpoint = [projectManifest.network.endpoint];
  }

  const network = processChainId({
    ...projectManifest.network,
    ...networkOverrides,
  });

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

  const chainTypes = projectManifest.network.chaintypes
    ? await getChainTypes(reader, root, projectManifest.network.chaintypes.file)
    : undefined;

  const dataSources = await updateDataSourcesV1_0_0(
    projectManifest.dataSources,
    reader,
    root,
    isCustomDs,
  );
  return {
    id: reader.root ? reader.root : path, //TODO, need to method to get project_id
    root,
    network,
    dataSources,
    schema,
    chainTypes,
    templates: [],
  };
}

const { version: packageVersion } = require('../../package.json');

async function loadProjectFromManifest1_0_0(
  projectManifest: ProjectManifestV1_0_0Impl,
  reader: Reader,
  path: string,
  networkOverrides?: Partial<SubstrateProjectNetworkConfig>,
  root?: string,
): Promise<SubqueryProject> {
  const project = await loadProjectFromManifestBase(
    projectManifest,
    reader,
    path,
    networkOverrides,
    root,
  );
  project.templates = await loadProjectTemplates(
    projectManifest.templates,
    project.root,
    reader,
    isCustomDs,
  );
  project.runner = projectManifest.runner;
  if (!validateSemver(packageVersion, project.runner.node.version)) {
    throw new Error(
      `Runner require node version ${project.runner.node.version}, current node ${packageVersion}`,
    );
  }
  return project;
}

export async function generateTimestampReferenceForBlockFilters(
  dataSources: SubstrateProjectDs[],
  api: ApiPromise,
): Promise<SubstrateProjectDs[]> {
  return insertBlockFiltersCronSchedules(
    dataSources,
    async (height: number) => {
      const block = await getBlockByHeight(api, height);
      return getTimestamp(block);
    },
    isRuntimeDs,
    SubstrateHandlerKind.Block,
  );
}
