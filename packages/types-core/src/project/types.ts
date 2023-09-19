// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {ParentProject, RunnerSpecs, BaseDataSource, BaseTemplateDataSource} from './versioned';

/**
 * Represents a common subquery project configuration.
 * @template N - The type of the network configuration (default: CommonSubqueryNetworkConfig).
 * @template DS - The type of the base data source (default: BaseDataSource).
 * @template T - The type of templates (default: unknown).
 */
export interface CommonSubqueryProject<
  N extends IProjectNetworkConfig = IProjectNetworkConfig,
  DS extends BaseDataSource = BaseDataSource,
  T extends BaseTemplateDataSource<DS> = BaseTemplateDataSource<DS>
> {
  /**
   * The version of the SubQuery project.
   * @type {string}
   * @default "1.0.0"
   */
  version?: string;
  /**
   * The name of the SubQuery project.
   * @type {string}
   */
  name?: string;
  /**
   * The specVersion of the SubQuery project, latest is 1.0.0
   * @type {string}
   * @default "1.0.0"
   */
  specVersion: string;
  /**
   * A description of the SubQuery project.
   * @type {string}
   */
  description?: string;
  /**
   * The graphql schema reference to a file.
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
   * The parent project of current project.
   * @readonly
   * @type {ParentProject}
   */
  readonly parent?: ParentProject;
  /**
   * The network configuration for the SubQuery project.
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
export interface IProjectNetworkConfig extends ProjectNetworkConfig {
  /**
   * The identity of the chain.
   * @type {string}
   * @example
   * chainId: '0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3' // Polkadot
   * @example
   * chainId: '1' // Ethereum
   * */
  chainId: string;
}

export type DsProcessor<DS> = {
  kind: string;
  validate: (ds: DS, assets: Record<string, string>) => void;
  dsFilterProcessor: (ds: DS, api: any) => boolean;
  handlerProcessors: Record<string, any>;
};

export interface ProjectRootAndManifest {
  root: string;
  manifests: string[];
}

export interface IProjectManifest<D> {
  specVersion: string;
  description: string;
  repository: string;
  dataSources: D[];
  validate(): void;
}

/**
 * Represents the network configuration for a project.
 * @interface
 */
export interface ProjectNetworkConfig {
  /**
   * The endpoint(s) for the network connection, which can be a single string or an array of strings.
   * @type {string | string[]}
   */
  endpoint: string | string[];

  /**
   * The subquery network dictionary (optional).
   * @type {string}
   */
  dictionary?: string;

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
   * The path or name of the referenced file.
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
