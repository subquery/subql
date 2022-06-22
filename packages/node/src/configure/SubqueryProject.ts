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
  CosmosProjectNetworkConfig,
  parseCosmosProjectManifest,
  ProjectManifestV0_3_0Impl,
  SubqlCosmosDataSource,
  ProjectManifestV1_0_0Impl,
} from '@subql/common-cosmos';
import { CustomModule } from '@subql/types-cosmos';
import { buildSchemaFromString } from '@subql/utils';
import { GraphQLSchema } from 'graphql';
import * as protobuf from 'protobufjs';
import {
  getProjectRoot,
  updateDataSourcesV0_3_0,
  processNetworkConfig,
} from '../utils/project';

export type CosmosChainType = CustomModule & { proto: protobuf.Root };

export type SubqlProjectDs = SubqlCosmosDataSource & {
  mapping: SubqlCosmosDataSource['mapping'] & { entryScript: string };
};

export type CosmosProjectNetConfig = CosmosProjectNetworkConfig & {
  chainTypes: Map<string, CosmosChainType>;
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
  network: Partial<CosmosProjectNetConfig>;
  dataSources: SubqlProjectDs[];
  schema: GraphQLSchema;
  templates: SubqlProjectDsTemplate[];
  chainTypes?: RegisteredTypes;
  runner?: RunnerSpecs;

  static async create(
    path: string,
    networkOverrides?: Partial<CosmosProjectNetworkConfig>,
    readerOptions?: ReaderOptions,
  ): Promise<SubqueryProject> {
    // We have to use reader here, because path can be remote or local
    // and the `loadProjectManifest(projectPath)` only support local mode
    const reader = await ReaderFactory.create(path, readerOptions);
    const projectSchema = await reader.getProjectSchema();
    if (projectSchema === undefined) {
      throw new Error(`Get manifest from project path ${path} failed`);
    }
    const manifest = parseCosmosProjectManifest(projectSchema);

    if (manifest.isV0_3_0) {
      return loadProjectFromManifestBase(
        manifest.asV0_3_0,
        reader,
        path,
        networkOverrides,
      );
    } else if (manifest.isV1_0_0) {
      return loadProjectFromManifest1_0_0(
        manifest.asV1_0_0,
        reader,
        path,
        networkOverrides,
      );
    }
  }
}

export interface SubqueryProjectNetwork {
  chainId: string;
  endpoint?: string;
  dictionary?: string;
  chainTypes?: Map<string, CosmosChainType>;
}

type SUPPORT_MANIFEST = ProjectManifestV0_3_0Impl | ProjectManifestV1_0_0Impl;

async function loadProjectFromManifestBase(
  projectManifest: SUPPORT_MANIFEST,
  reader: Reader,
  path: string,
  networkOverrides?: Partial<CosmosProjectNetworkConfig>,
): Promise<SubqueryProject> {
  const root = await getProjectRoot(reader);

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

  const dataSources = await updateDataSourcesV0_3_0(
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
    templates: [],
  };
}

const { version: packageVersion } = require('../../package.json');

async function loadProjectFromManifest1_0_0(
  projectManifest: ProjectManifestV1_0_0Impl,
  reader: Reader,
  path: string,
  networkOverrides?: Partial<CosmosProjectNetworkConfig>,
): Promise<SubqueryProject> {
  const project = await loadProjectFromManifestBase(
    projectManifest,
    reader,
    path,
    networkOverrides,
  );

  project.templates = await loadProjectTemplates(projectManifest, reader);

  project.runner = projectManifest.runner;
  if (!validateSemver(packageVersion, project.runner.node.version)) {
    throw new Error(
      `Runner require node version ${project.runner.node.version}, current node ${packageVersion}`,
    );
  }

  return project;
}

async function loadProjectTemplates(
  projectManifest: ProjectManifestV1_0_0Impl,
  reader: Reader,
): Promise<SubqlProjectDsTemplate[]> {
  const root = await getProjectRoot(reader);

  const dsTemplates = await updateDataSourcesV0_3_0(
    projectManifest.templates,
    reader,
    root,
  );
  return dsTemplates.map((ds, index) => ({
    ...ds,
    name: projectManifest.templates[index].name,
  }));
}
