// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {GraphQLSchema} from 'graphql';
import {ParentProject, RunnerSpecs, BaseDataSource} from './versioned';

/**
 * Represents the common network configuration for a subquery project.
 * @interface
 * @extends {ProjectNetworkConfig}
 */
export interface CommonSubqueryNetworkConfig extends ProjectNetworkConfig {
  /**
   * The blockchain network identifier
   * @type {string}
   */
  chainId: string;
  /**
   * The chain types associated with the network (optional).
   * @type {FileReference}
   */
  chaintypes?: FileReference; // Align with previous field name
}

/**
 * Represents a common subquery project configuration.
 * @template N - The type of the network configuration (default: CommonSubqueryNetworkConfig).
 * @template DS - The type of the base data source (default: BaseDataSource).
 * @template T - The type of templates (default: unknown).
 */
export interface CommonSubqueryProject<
  N extends CommonSubqueryNetworkConfig = CommonSubqueryNetworkConfig,
  DS extends BaseDataSource = BaseDataSource,
  T extends DS = DS & {name: string}
> {
  /**
   * The version of the subquery project.
   * @type {string}
   */
  version?: string;
  /**
   * The name of the subquery project.
   * @type {string}
   */
  name?: string;
  /**
   * The specVersion of the subquery project, latest is 1.0.0
   * @type {string}
   * @default "1.0.0"
   */
  specVersion: string;
  /**
   * A description of the subquery project.
   * @type {string}
   */
  description?: string;
  /**
   * The schema reference to a file.
   * @type {FileReference}
   */
  schema: FileReference;
  /**
   * An array of project templates associated with the project.
   * @readonly
   * @type {T[]}
   */
  readonly templates?: T[];
  /**
   * The runner specifications for the common subquery project.
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
   * The network configuration for the subquery project.
   * @readonly
   * @type {N}
   */
  readonly network: N;
  /**
   * An array of data sources associated with the subquery project.
   * @readonly
   * @type {DS[]}
   */
  readonly dataSources: DS[];
}

export interface IProjectNetworkConfig extends ProjectNetworkConfig {
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
  toDeployment(): string;
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
   * An array of block numbers or block hashes to bypass (optional).
   * @type {(number | string)[]}
   */
  bypassBlocks?: (number | string)[];
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
