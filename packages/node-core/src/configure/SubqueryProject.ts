// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import {CommonProjectManifestV1_0_0Impl, normalizeNetworkEndpoints, validateSemver} from '@subql/common';
import {
  BaseCustomDataSource,
  BaseDataSource,
  BaseTemplateDataSource,
  IProjectNetworkConfig,
  ParentProject,
  Reader,
  RunnerSpecs,
} from '@subql/types-core';
import {buildSchemaFromString} from '@subql/utils';
import {GraphQLSchema} from 'graphql';
import {ISubqueryProject} from '../indexer';
import {
  insertBlockFiltersCronSchedules,
  IsCustomDs,
  IsRuntimeDs,
  loadProjectTemplates,
  updateDataSourcesV1_0_0,
} from '../utils';

class NotSupportedError extends Error {
  constructor(expected: string, received: string) {
    super(`Manifest specVersion ${expected} is not, supported. Received ${received}`);
  }
}

export class BaseSubqueryProject<
  DS extends BaseDataSource = BaseDataSource,
  TemplateDS extends BaseTemplateDataSource = BaseTemplateDataSource,
  NetworkConfig extends IProjectNetworkConfig = IProjectNetworkConfig,
> implements ISubqueryProject
{
  #dataSources: DS[];

  constructor(
    readonly id: string,
    readonly root: string,
    readonly network: NetworkConfig,
    readonly schema: GraphQLSchema,
    dataSources: DS[],
    readonly templates: TemplateDS[],
    private blockHandlerKind: string,
    private isRuntimeDs: IsRuntimeDs<any>,
    readonly runner?: RunnerSpecs,
    readonly parent?: ParentProject
  ) {
    this.#dataSources = dataSources;
  }

  static async create<Project extends BaseSubqueryProject>(config: {
    parseManifest: (raw: unknown) => CommonProjectManifestV1_0_0Impl;
    path: string;
    rawManifest: unknown;
    reader: Reader;
    root: string; // If project local then directory otherwise temp directory
    nodeSemver: string;
    blockHandlerKind: string;
    isCustomDs: IsCustomDs<Project['dataSources'][0], Project['dataSources'][0] & BaseCustomDataSource>;
    isRuntimeDs: IsRuntimeDs<any>; // This could be better
    networkOverrides?: Partial<Project['network']>;
  }): Promise<Project> {
    // rawManifest and reader can be reused here.
    // It has been pre-fetched and used for rebase manifest runner options with args
    // in order to generate correct configs.

    // But we still need reader here, because path can be remote or local
    // and the `loadProjectManifest(projectPath)` only support local mode
    assert(config.rawManifest !== undefined, new Error(`Get manifest from project path ${config.path} failed`));

    const manifest = config.parseManifest(config.rawManifest);

    // Note this needs to be updated if a new version is created, or use semver
    if (manifest.specVersion !== '1.0.0') {
      throw new NotSupportedError('<1.0.0', manifest.specVersion);
    }

    // Convert endpoints to the latest format

    manifest.network.endpoint = normalizeNetworkEndpoints(manifest.network.endpoint);

    const network = processChainId({
      ...manifest.network,
      ...config.networkOverrides,
    });

    assert(network.endpoint, new Error(`Network endpoint must be provided for network. chainId="${network.chainId}"`));

    const schemaString: string = await config.reader.getFile(manifest.schema.file);
    assert(schemaString, 'Schema file is empty');
    const schema = buildSchemaFromString(schemaString);

    const [dataSources, templates] = await Promise.all([
      updateDataSourcesV1_0_0(manifest.dataSources, config.reader, config.root, config.isCustomDs),
      loadProjectTemplates(manifest.templates, config.root, config.reader, config.isCustomDs),
    ]);

    const runner = manifest.runner;
    assert(
      validateSemver(config.nodeSemver, runner.node.version),
      new Error(`Runner require node version ${runner.node.version}, current node ${config.nodeSemver}`)
    );

    return new BaseSubqueryProject(
      config.reader.root ? config.reader.root : config.path, //TODO, need to method to get project_id
      config.root,
      network,
      schema,
      dataSources,
      templates,
      // chainTypes,
      config.blockHandlerKind,
      config.isRuntimeDs,
      runner,
      manifest.parent
    ) as Project;
  }

  get dataSources(): DS[] {
    return this.#dataSources;
  }

  async applyCronTimestamps(getTimestamp: (height: number) => Promise<Date | undefined>): Promise<void> {
    this.#dataSources = await insertBlockFiltersCronSchedules(
      this.dataSources,
      getTimestamp,
      this.isRuntimeDs,
      this.blockHandlerKind
    );
  }
}

function processChainId<NetworkConfig extends IProjectNetworkConfig>(network: any): NetworkConfig {
  if (network.chainId && network.genesisHash) {
    throw new Error('Please only provide one of chainId and genesisHash');
  } else if (network.genesisHash && !network.chainId) {
    network.chainId = network.genesisHash;
  }
  delete network.genesisHash;
  return network;
}
