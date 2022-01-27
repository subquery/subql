// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { RegisteredTypes } from '@polkadot/types/types';
import {
  ProjectNetworkConfig,
  ReaderFactory,
  parseProjectManifest,
  ReaderOptions,
  ProjectManifestV0_0_1Impl,
  Reader,
  buildSchemaFromString,
  ProjectManifestV0_2_0Impl,
  ProjectManifestV0_2_1Impl,
} from '@subql/common';
import { SubqlDatasource } from '@subql/types';
import { GraphQLSchema } from 'graphql';
import { pick } from 'lodash';
import {
  getChainTypes,
  getProjectRoot,
  updateDataSourcesV0_0_1,
  updateDataSourcesV0_2_0,
} from '../utils/project';

export type SubqlProjectDs = SubqlDatasource & {
  mapping: SubqlDatasource['mapping'] & { entryScript: string };
};

export type SubqlProjectDsTemplate = Omit<SubqlProjectDs, 'startBlock'> & { name: string; };

export class SubqueryProject {
  id: string;
  root: string;
  network: Partial<ProjectNetworkConfig>;
  dataSources: SubqlProjectDs[];
  schema: GraphQLSchema;
  templates: SubqlProjectDsTemplate[];
  chainTypes?: RegisteredTypes;

  static async create(
    path: string,
    networkOverrides?: Partial<ProjectNetworkConfig>,
    readerOptions?: ReaderOptions,
  ): Promise<SubqueryProject> {
    // We have to use reader here, because path can be remote or local
    // and the `loadProjectManifest(projectPath)` only support local mode
    const reader = await ReaderFactory.create(path, readerOptions);
    const projectSchema = await reader.getProjectSchema();
    const manifest = parseProjectManifest(projectSchema);

    if (manifest.isV0_0_1) {
      return loadProjectFromManifest0_0_1(
        manifest.asV0_0_1,
        reader,
        path,
        networkOverrides,
      );
    } else if (manifest.isV0_2_0) {
      return loadProjectFromManifest0_2_0(
        manifest.asV0_2_0,
        reader,
        path,
        networkOverrides,
      );
    } else if (manifest.isV0_2_1) {
      return loadProjectFromManifest0_2_1(
        manifest.asV0_2_1,
        reader,
        path,
        networkOverrides
      );
    }
  }
}

async function loadProjectFromManifest0_0_1(
  projectManifest: ProjectManifestV0_0_1Impl,
  reader: Reader,
  path: string,
  networkOverrides?: Partial<ProjectNetworkConfig>,
): Promise<SubqueryProject> {
  return {
    id: path, //user project path as it id for now
    root: await getProjectRoot(reader, path),
    network: {
      ...projectManifest.network,
      ...networkOverrides,
    },
    dataSources: await updateDataSourcesV0_0_1(
      projectManifest.dataSources,
      reader,
    ),
    schema: buildSchemaFromString(await reader.getFile(projectManifest.schema)),
    chainTypes: pick<RegisteredTypes>(projectManifest.network, [
      'types',
      'typesAlias',
      'typesBundle',
      'typesChain',
      'typesSpec',
    ]),
    templates: []
  };
}

async function loadProjectFromManifest0_2_0(
  projectManifest: ProjectManifestV0_2_0Impl,
  reader: Reader,
  path: string,
  networkOverrides?: Partial<ProjectNetworkConfig>,
): Promise<SubqueryProject> {
  const root = await getProjectRoot(reader, path);

  const network = {
    ...projectManifest.network,
    ...networkOverrides,
  };
  if (!network.endpoint) {
    throw new Error(
      `Network endpoint must be provided for network. genesisHash="${network.genesisHash}"`,
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

async function loadProjectFromManifest0_2_1(
  projectManifest: ProjectManifestV0_2_1Impl,
  reader: Reader,
  path: string,
  networkOverrides?: Partial<ProjectNetworkConfig>,
): Promise<SubqueryProject> {
  const root = await getProjectRoot(reader, path);
  const project = await loadProjectFromManifest0_2_0(
    projectManifest,
    reader,
    path,
    networkOverrides
  );

  project.templates = (await updateDataSourcesV0_2_0(
    projectManifest.templates,
    reader,
    root,
  )).map((ds, index) => ({ ...ds, name: projectManifest.templates[index].name}));

  return project;
}
