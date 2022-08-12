// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { RegisteredTypes } from '@polkadot/types/types';
import {
  ReaderFactory,
  ReaderOptions,
  Reader,
  RunnerSpecs,
  validateSemver,
} from '@subql/common';
import {
  SubstrateProjectNetworkConfig,
  parseSubstrateProjectManifest,
  ProjectManifestV0_2_0Impl,
  SubstrateDataSource,
  FileType,
  ProjectManifestV1_0_0Impl,
} from '@subql/common-avalanche';
import { buildSchemaFromString } from '@subql/utils';
import { GraphQLSchema } from 'graphql';
import {
  getChainTypes,
  getProjectRoot,
  updateDataSourcesV0_2_0,
} from '../utils/project';

export type SubqlProjectDs = SubstrateDataSource & {
  mapping: SubstrateDataSource['mapping'] & { entryScript: string };
};

export type SubqlProjectDsTemplate = Omit<SubqlProjectDs, 'startBlock'> & {
  name: string;
};

const NOT_SUPPORT = (name: string) => () => {
  throw new Error(`Manifest specVersion ${name}() is not supported`);
};

export class SubqueryProject {
  id: string;
  root: string;
  network: Partial<SubstrateProjectNetworkConfig>;
  dataSources: SubqlProjectDs[];
  schema: GraphQLSchema;
  templates: SubqlProjectDsTemplate[];
  chainTypes?: RegisteredTypes;
  runner?: RunnerSpecs;

  static async create(
    path: string,
    networkOverrides?: Partial<SubstrateProjectNetworkConfig>,
    readerOptions?: ReaderOptions,
  ): Promise<SubqueryProject> {
    // We have to use reader here, because path can be remote or local
    // and the `loadProjectManifest(projectPath)` only support local mode
    const reader = await ReaderFactory.create(path, readerOptions);
    const projectSchema = await reader.getProjectSchema();
    if (projectSchema === undefined) {
      throw new Error(`Get manifest from project path ${path} failed`);
    }
    const manifest = parseSubstrateProjectManifest(projectSchema);

    if (manifest.isV1_0_0) {
      return loadProjectFromManifest1_0_0(
        manifest.asV1_0_0,
        reader,
        path,
        networkOverrides,
      );
    } else {
      NOT_SUPPORT(manifest.specVersion);
    }
  }
}

export interface SubqueryProjectNetwork {
  chainId: string;
  endpoint?: string;
  dictionary?: string;
  chaintypes?: FileType;
}

function processChainId(network: any): SubqueryProjectNetwork {
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
): Promise<SubqueryProject> {
  const root = await getProjectRoot(reader);

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

  const dataSources = await updateDataSourcesV0_2_0(
    projectManifest.dataSources,
    reader,
    root,
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

const {
  name: packageName,
  version: packageVersion,
} = require('../../package.json');

async function loadProjectFromManifest1_0_0(
  projectManifest: ProjectManifestV1_0_0Impl,
  reader: Reader,
  path: string,
  networkOverrides?: Partial<SubstrateProjectNetworkConfig>,
): Promise<SubqueryProject> {
  const project = await loadProjectFromManifestBase(
    projectManifest,
    reader,
    path,
    networkOverrides,
  );
  project.runner = projectManifest.runner;
  if (packageName !== project.runner.node.name) {
    throw new Error(
      `Runner requires ${project.runner.node.name}, current node ${packageName}`,
    );
  }
  if (!validateSemver(packageVersion, project.runner.node.version)) {
    throw new Error(
      `Runner require node version ${project.runner.node.version}, current node ${packageVersion}`,
    );
  }
  return project;
}
