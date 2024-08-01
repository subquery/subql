// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {BaseDataSource, BaseTemplateDataSource, ParentProject, RunnerSpecs} from './versioned';

/**
 * Represents a common subquery project configuration.
 * @template N - The type of the network configuration (default: CommonSubqueryNetworkConfig).
 * @template DS - The type of the base data source (default: BaseDataSource).
 * @template T - The type of templates (default: unknown).
 */
export interface CommonSubqueryProject<
  N extends IProjectNetworkConfig = IProjectNetworkConfig,
  DS extends BaseDataSource = BaseDataSource,
  T extends BaseTemplateDataSource<DS> = BaseTemplateDataSource<DS>,
> {
  /**
   * The repository of your SubQuery project.
   * @type {string}
   */
  repository?: string;
  /**
   * The version string of your SubQuery project.
   * @type {string}
   * @default "1.0.0"
   */
  version?: string;
  /**
   * The name of your SubQuery project.
   * @type {string}
   */
  name?: string;
  /**
   * The specVersion of the SubQuery project manifest file, the latest and suggested is 1.0.0
   * @type {string}
   * @default "1.0.0"
   */
  specVersion: string;
  /**
   * A description of your SubQuery project.
   * @type {string}
   */
  description?: string;
  /**
   * The location of your GraphQL schema file.
   * @type {FileReference}
   */
  schema: FileReference;
  /**
   * The runner specifications for the common SubQuery project.
   * @readonly
   * @type {RunnerSpecs}
   */
  readonly runner?: RunnerSpecs;
  /**
   * The parent manifest of current project.
   * @readonly
   * @type {ParentProject}
   */
  readonly parent?: ParentProject;
  /**
   * The network configuration for the SubQuery project.
   *
   * This defines what network you are wanting to index as well as the details on how to conect to it.
   * @readonly
   * @type {N}
   */
  readonly network: N;
  /**
   * An array of data sources associated with the SubQuery project.
   *
   * Defines the data that will be filtered and extracted and the location of the mapping function handler for the data transformation to be applied.
   * @readonly
   * @type {DS[]}
   */
  readonly dataSources: DS[];
  /**
   * An array of project templates associated with the project.
   *
   * These are the same as datasources but instead of having a startBlock they have a unique name.
   * These are used to dynamically create data sources, this is useful when you don't know the start block.
   * e.g When a factory creates a new instance of a contract you can initialize a datasource from a template in your mapping function.
   * @readonly
   * @type {T[]}
   */
  readonly templates?: T[];
}

/**
 * Represents the common network configuration for a subquery project.
 * @interface
 * @extends {ProjectNetworkConfig}
 */
export interface IProjectNetworkConfig<EndpointConfig extends IEndpointConfig = IEndpointConfig>
  extends ProjectNetworkConfig<EndpointConfig> {
  /**
   * The unique identity of the chain.
   *
   * This differs for different blockchain ecosystems, please refer to our documentation
   * @type {string}
   * @example
   * chainId: '1' // Ethereum
   * @example
   * chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3' // Polkadot
   * @example
   * chainId: 'juno-1' // Cosmos Juno
   * */
  chainId: string;
}

export type DsProcessor<DS, P extends Record<string, any> = Record<string, any>, API = any> = {
  kind: string;
  validate: (ds: DS, assets: Record<string, string>) => void;
  dsFilterProcessor: (ds: DS, api: API) => boolean;
  handlerProcessors: P;
};

export interface ProjectRootAndManifest {
  root: string;
  manifests: string[];
}

export interface IProjectManifest<D> {
  specVersion: string;
  description?: string;
  repository?: string;
  dataSources: D[];
  toDeployment(): string;
  validate(): void;
}

/* Define specific behaviour for rate limits*/
export interface IEndpointConfig {
  /* Headers to be supplied with the requests to the endpoint */
  headers?: Record<string, string>;
}

/**
 * Represents the network configuration for a project.
 * @interface
 */
export interface ProjectNetworkConfig<EndpointConfig extends IEndpointConfig = IEndpointConfig> {
  /**
   * The endpoint(s) for the network connection, which can be a single string or an array of strings.
   *
   * Endpoints ideally should non-pruned archive nodes (so you have access for the entire chain state)
   * We recommend providing more than one endpoint for improved reliability, performance, and uptime.
   * Public nodes may be rate limited, which can affect indexing speed
   * When developing your project we suggest adding a private API key
   *
   * @type {string | string[] | Record<string, IEndpointConfig> }
   */
  endpoint: string | string[] | Record<string, EndpointConfig>;

  /**
   * The SubQuery network dictionary endpoint (optional).
   * This significantly speeds up indexing of your project.
   *
   * @type {string}
   */
  dictionary?: string | string[];

  /**
   * An array of block numbers or block ranges to bypass (optional).
   * @type {(number | string)[]}
   * @example
   * [1, 2, 3, '5-10']
   */
  bypassBlocks?: (number | `${number}-${number}`)[];
}

/**
 * Represents a reference to a file.
 * @interface
 */
export interface FileReference {
  /**
   * The path or name of the referenced file from the root of this project.
   * @type {string}
   */
  file: string;
}
export type Processor<O = any> = FileReference & {options?: O};

export interface DictionaryQueryCondition {
  field: string;
  value: string | string[] | boolean;
  matcher?: string; // defaults to "equalTo", use "contains" for JSON
}

export interface DictionaryQueryEntry {
  entity: string;
  conditions: DictionaryQueryCondition[];
}
