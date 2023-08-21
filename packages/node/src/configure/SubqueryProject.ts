// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Block } from '@cosmjs/stargate';
import { toRfc3339WithNanoseconds } from '@cosmjs/tendermint-rpc';
import { Injectable } from '@nestjs/common';
import { Reader, RunnerSpecs, validateSemver } from '@subql/common';
import {
  CosmosProjectNetworkConfig,
  parseCosmosProjectManifest,
  SubqlCosmosDataSource,
  ProjectManifestV1_0_0Impl,
  isRuntimeCosmosDs,
  CosmosBlockFilter,
  isCustomCosmosDs,
} from '@subql/common-cosmos';
import { getProjectRoot, updateDataSourcesV1_0_0 } from '@subql/node-core';
import { SubqlCosmosHandlerKind } from '@subql/types-cosmos';
import { buildSchemaFromString } from '@subql/utils';
import Cron from 'cron-converter';
import { GraphQLSchema } from 'graphql';
import { CosmosClient } from '../indexer/api.service';
import { processNetworkConfig } from '../utils/project';

export type SubqlProjectDs = SubqlCosmosDataSource & {
  mapping: SubqlCosmosDataSource['mapping'] & { entryScript: string };
};

export type SubqlProjectBlockFilter = CosmosBlockFilter & {
  cronSchedule?: {
    schedule: Cron.Seeker;
    next: number;
  };
};

export type SubqlProjectDsTemplate = Omit<SubqlProjectDs, 'startBlock'> & {
  name: string;
};

const NOT_SUPPORT = (name: string) => {
  throw new Error(`Manifest specVersion ${name} is not supported`);
};

// This is the runtime type after we have mapped genesisHash to chainId and endpoint/dict have been provided when dealing with deployments
type NetworkConfig = CosmosProjectNetworkConfig & { chainId: string };

@Injectable()
export class SubqueryProject {
  id: string;
  root: string;
  network: NetworkConfig;
  dataSources: SubqlProjectDs[];
  schema: GraphQLSchema;
  templates: SubqlProjectDsTemplate[];
  runner?: RunnerSpecs;

  static async create(
    path: string,
    rawManifest: unknown,
    reader: Reader,
    networkOverrides?: Partial<CosmosProjectNetworkConfig>,
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

    const manifest = parseCosmosProjectManifest(rawManifest);

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

type SUPPORT_MANIFEST = ProjectManifestV1_0_0Impl;

async function loadProjectFromManifestBase(
  projectManifest: SUPPORT_MANIFEST,
  reader: Reader,
  path: string,
  networkOverrides?: Partial<CosmosProjectNetworkConfig>,
  root?: string,
): Promise<SubqueryProject> {
  root = root ?? (await getProjectRoot(reader));

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
    projectManifest,
    project.root,
    reader,
  );
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
  root: string,
  reader: Reader,
): Promise<SubqlProjectDsTemplate[]> {
  if (!projectManifest.templates || !projectManifest.templates.length) {
    return [];
  }
  const dsTemplates = await updateDataSourcesV1_0_0(
    projectManifest.templates,
    reader,
    root,
    isCustomCosmosDs,
  );
  return dsTemplates.map((ds, index) => ({
    ...ds,
    name: projectManifest.templates[index].name,
  }));
}

// eslint-disable-next-line @typescript-eslint/require-await
export async function generateTimestampReferenceForBlockFilters(
  dataSources: SubqlProjectDs[],
  api: CosmosClient,
): Promise<SubqlProjectDs[]> {
  const cron = new Cron();

  dataSources = await Promise.all(
    dataSources.map(async (ds) => {
      if (isRuntimeCosmosDs(ds)) {
        const startBlock = ds.startBlock ?? 1;
        let block: Block;
        let timestampReference: Date;

        ds.mapping.handlers = await Promise.all(
          ds.mapping.handlers.map(async (handler) => {
            if (handler.kind === SubqlCosmosHandlerKind.Block) {
              if (handler.filter?.timestamp) {
                if (!block) {
                  const response = await api.blockInfo(startBlock);
                  timestampReference = new Date(
                    toRfc3339WithNanoseconds(response.block.header.time),
                  );
                }
                try {
                  cron.fromString(handler.filter.timestamp);
                } catch (e) {
                  throw new Error(
                    `Invalid Cron string: ${handler.filter.timestamp}`,
                  );
                }

                const schedule = cron.schedule(timestampReference);
                (handler.filter as SubqlProjectBlockFilter).cronSchedule = {
                  schedule: schedule,
                  get next() {
                    return Date.parse(this.schedule.next().format());
                  },
                };
              }
            }
            return handler;
          }),
        );
      }
      return ds;
    }),
  );

  return dataSources;
}
