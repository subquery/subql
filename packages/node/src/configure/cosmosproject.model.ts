// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {
  ReaderFactory,
  ReaderOptions,
  Reader,
  RunnerSpecs,
  CosmosProjectNetworkConfig,
  ProjectManifestV0_3_0Impl,
  parseCosmosProjectManifest,
  ProjectManifestV1_0_0Impl,
} from '@subql/common-cosmos';
import {
  CustomDataSourceAsset,
  SubqlCosmosDatasource,
} from '@subql/types-cosmos';
import { buildSchemaFromString } from '@subql/utils';
import { GraphQLSchema } from 'graphql';
import { getProjectRoot, updateDataSourcesV0_3_0 } from '../utils/project';

export type SubqlCosmosProjectDs = SubqlCosmosDatasource & {
  mapping: SubqlCosmosDatasource['mapping'] & { entryScript: string };
  chainTypes: SubqlCosmosDatasource['chainTypes'];
};

export type SubqlProjectDsTemplate = Omit<
  SubqlCosmosProjectDs,
  'startBlock'
> & {
  name: string;
};

export class SubqueryCosmosProject {
  id: string;
  root: string;
  network: Partial<CosmosProjectNetworkConfig>;
  dataSources: SubqlCosmosProjectDs[];
  schema: GraphQLSchema;
  templates: SubqlProjectDsTemplate[];
  runner?: RunnerSpecs;
  static async create(
    path: string,
    networkOverrides?: Partial<CosmosProjectNetworkConfig>,
    readerOptions?: ReaderOptions,
  ): Promise<SubqueryCosmosProject> {
    // We have to use reader here, because path can be remote or local
    // and the `loadProjectManifest(projectPath)` only support local mode
    const reader = await ReaderFactory.create(path, readerOptions);
    const projectSchema = await reader.getProjectSchema();
    const manifest = parseCosmosProjectManifest(projectSchema);

    if (manifest.isV0_3_0) {
      return loadProjectFromManifest0_3_0(
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

type SUPPORT_MANIFEST = ProjectManifestV0_3_0Impl | ProjectManifestV1_0_0Impl;

async function loadProjectFromManifest1_0_0(
  projectManifest: ProjectManifestV1_0_0Impl,
  reader: Reader,
  path: string,
  networkOverrides?: Partial<CosmosProjectNetworkConfig>,
): Promise<SubqueryCosmosProject> {
  const root = await getProjectRoot(reader, path);

  const project = await loadProjectFromManifestBase(
    projectManifest,
    reader,
    path,
    networkOverrides,
  );
  project.runner = projectManifest.runner;
  project.templates =
    projectManifest.templates &&
    (
      await updateDataSourcesV0_3_0(projectManifest.templates, reader, root)
    ).map((ds, index) => ({
      ...ds,
      name: projectManifest.templates[index].name,
    }));

  return project;
}

async function loadProjectFromManifest0_3_0(
  projectManifest: ProjectManifestV0_3_0Impl,
  reader: Reader,
  path: string,
  networkOverrides?: Partial<CosmosProjectNetworkConfig>,
): Promise<SubqueryCosmosProject> {
  return loadProjectFromManifestBase(
    projectManifest,
    reader,
    path,
    networkOverrides,
  );
}

async function loadProjectFromManifestBase(
  projectManifest: SUPPORT_MANIFEST,
  reader: Reader,
  path: string,
  networkOverrides?: Partial<CosmosProjectNetworkConfig>,
): Promise<SubqueryCosmosProject> {
  const root = await getProjectRoot(reader, path);

  const network = {
    ...projectManifest.network,
    ...networkOverrides,
  };
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
