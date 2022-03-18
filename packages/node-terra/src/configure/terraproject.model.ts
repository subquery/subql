// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {
  ReaderFactory,
  ReaderOptions,
  Reader,
  buildSchemaFromString,
} from '@subql/common';
import {
  loadTerraProjectManifest,
  TerraProjectNetworkConfig,
  TerraProjectManifestVersioned,
  TerraProjectNetworkV0_3_0,
  ProjectManifestV0_3_0Impl,
  parseTerraProjectManifest,
} from '@subql/common-terra';
import {
  SubqlTerraDatasourceKind,
  SubqlTerraDatasource,
} from '@subql/types-terra';
import { GraphQLSchema } from 'graphql';
import { getProjectRoot, updateDataSourcesV0_3_0 } from '../utils/project';

export type SubqlTerraProjectDs = SubqlTerraDatasource & {
  mapping: SubqlTerraDatasource['mapping'] & { entryScript: string };
};

export type SubqlProjectDsTemplate = Omit<SubqlTerraProjectDs, 'startBlock'> & {
  name: string;
};

export class SubqueryTerraProject {
  id: string;
  root: string;
  network: Partial<TerraProjectNetworkConfig>;
  dataSources: SubqlTerraProjectDs[];
  schema: GraphQLSchema;
  templates: SubqlProjectDsTemplate[];

  static async create(
    path: string,
    networkOverrides?: Partial<TerraProjectNetworkConfig>,
    readerOptions?: ReaderOptions,
  ): Promise<SubqueryTerraProject> {
    // We have to use reader here, because path can be remote or local
    // and the `loadProjectManifest(projectPath)` only support local mode
    const reader = await ReaderFactory.create(path, readerOptions);
    const projectSchema = await reader.getProjectSchema();
    const manifest = parseTerraProjectManifest(projectSchema);

    if (manifest.isV0_3_0) {
      return loadProjectFromManifest0_3_0(
        manifest.asV0_3_0,
        reader,
        path,
        networkOverrides,
      );
    }
  }
}

async function loadProjectFromManifest0_3_0(
  projectManifest: ProjectManifestV0_3_0Impl,
  reader: Reader,
  path: string,
  networkOverrides?: Partial<TerraProjectNetworkConfig>,
): Promise<SubqueryTerraProject> {
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
