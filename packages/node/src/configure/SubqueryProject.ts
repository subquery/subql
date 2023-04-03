// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Block } from '@ethersproject/abstract-provider';
import { Injectable } from '@nestjs/common';
import { RegisteredTypes } from '@polkadot/types/types';
import {
  ReaderFactory,
  ReaderOptions,
  Reader,
  RunnerSpecs,
  validateSemver,
} from '@subql/common';
import {
  EthereumProjectNetworkConfig,
  parseEthereumProjectManifest,
  SubqlEthereumDataSource,
  EthereumBlockFilter,
  FileType,
  ProjectManifestV1_0_0Impl,
  isRuntimeDs,
  EthereumHandlerKind,
} from '@subql/common-ethereum';
import { buildSchemaFromString } from '@subql/utils';
import Cron from 'cron-converter';
import { GraphQLSchema } from 'graphql';
import { EthereumApi } from '../ethereum/api.ethereum';
import {
  getChainTypes,
  getProjectRoot,
  updateDataSourcesV0_2_0,
} from '../utils/project';
// import { getBlockByHeight, getTimestamp } from '../utils/substrate';

export type SubqlProjectDs = SubqlEthereumDataSource & {
  mapping: SubqlEthereumDataSource['mapping'] & { entryScript: string };
};

export type SubqlProjectBlockFilter = EthereumBlockFilter & {
  cronSchedule?: {
    schedule: Cron.Seeker;
    next: number;
  };
};

export type SubqlProjectDsTemplate = Omit<SubqlProjectDs, 'startBlock'> & {
  name: string;
};

const NOT_SUPPORT = (name: string) => {
  throw new Error(`Manifest specVersion ${name}() is not supported`);
};

@Injectable()
export class SubqueryProject {
  id: string;
  root: string;
  network: Partial<EthereumProjectNetworkConfig>;
  dataSources: SubqlProjectDs[];
  schema: GraphQLSchema;
  templates: SubqlProjectDsTemplate[];
  chainTypes?: RegisteredTypes;
  runner?: RunnerSpecs;

  static async create(
    path: string,
    networkOverrides?: Partial<EthereumProjectNetworkConfig>,
    readerOptions?: ReaderOptions,
  ): Promise<SubqueryProject> {
    // We have to use reader here, because path can be remote or local
    // and the `loadProjectManifest(projectPath)` only support local mode
    const reader = await ReaderFactory.create(path, readerOptions);
    const projectSchema = await reader.getProjectSchema();
    if (projectSchema === undefined) {
      throw new Error(`Get manifest from project path ${path} failed`);
    }
    const manifest = parseEthereumProjectManifest(projectSchema);

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
  endpoint?: string | string[];
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
  networkOverrides?: Partial<EthereumProjectNetworkConfig>,
): Promise<SubqueryProject> {
  const root = await getProjectRoot(reader);

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

  const dataSources = await updateDataSourcesV0_2_0(
    projectManifest.dataSources,
    reader,
    root,
  );

  const templates = await loadProjectTemplates(projectManifest, root, reader);

  return {
    id: reader.root ? reader.root : path, //TODO, need to method to get project_id
    root,
    network,
    dataSources,
    schema,
    chainTypes,
    templates,
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
  networkOverrides?: Partial<EthereumProjectNetworkConfig>,
): Promise<SubqueryProject> {
  const project = await loadProjectFromManifestBase(
    projectManifest,
    reader,
    path,
    networkOverrides,
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
  if (projectManifest.templates && projectManifest.templates.length !== 0) {
    const dsTemplates = await updateDataSourcesV0_2_0(
      projectManifest.templates,
      reader,
      root,
    );
    return dsTemplates.map((ds, index) => ({
      ...ds,
      name: projectManifest.templates[index].name,
    }));
  }
}

// eslint-disable-next-line @typescript-eslint/require-await
export async function generateTimestampReferenceForBlockFilters(
  dataSources: SubqlProjectDs[],
  api: EthereumApi,
): Promise<SubqlProjectDs[]> {
  const cron = new Cron();

  dataSources = await Promise.all(
    dataSources.map(async (ds) => {
      if (isRuntimeDs(ds)) {
        const startBlock = ds.startBlock ?? 1;
        let block: Block;
        let timestampReference: Date;

        ds.mapping.handlers = await Promise.all(
          ds.mapping.handlers.map(async (handler) => {
            if (handler.kind === EthereumHandlerKind.Block) {
              if (handler.filter?.timestamp) {
                if (!block) {
                  block = await api.getBlockByHeightOrHash(startBlock);
                  timestampReference = new Date(block.timestamp * 1000); // Add millis
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
