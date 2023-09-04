// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {BaseDataSource} from '../base';
import {ProjectManifestV0_2_1, TemplateBase} from '../v0_2_1';

/**
 * Represents specifications for an indexer runner.
 * @interface
 */
export interface RunnerSpecs {
  /**
   * The specifications for a node.
   * @type {NodeSpec}
   */
  node: NodeSpec;

  /**
   * The specifications for a query.
   * @type {QuerySpec}
   */
  query: QuerySpec;
}

/**
 * Represents specifications for a node.
 * @interface
 * @example
 * // Example of a substrate based NodeSpec
 * const nodeSpec = {
 *   name: '@subql/node'
 *   version: '^2.15.0'
 *   options: {
 *     historical: true
 *   }
 * }
 */
export interface NodeSpec {
  /**
   * The name of the indexer node.
   * @type {string}
   */
  name: string;

  /**
   * The version of the indexer node.
   * @type {string}
   * @default "*"
   */
  version: string;

  /**
   * Additional options for the node (optional).
   * @type {NodeOptions}
   */
  options?: NodeOptions;
}

/**
 * Represents specifications for a query.
 * @interface
 */
export interface QuerySpec {
  /**
   * The name of the query service.
   * @type {string}
   * @default "@subql/query"
   */
  name: string;
  /**
   * The version of the query service.
   * @type {string}
   * @default "*"
   */
  version: string;
}

/**
 * Represents optional configuration options for a node.
 * @interface
 */
export interface NodeOptions {
  /**
   * Indicates whether historical data is enabled for the indexer (optional).
   * @type {boolean}
   */
  historical?: boolean;

  /**
   * Indicates whether unsafe mode are allowed for the indexer (optional).
   * @type {boolean}
   */
  unsafe?: boolean;

  /**
   * Indicates whether unfinalized blocks are supported by the indexer (optional).
   * @type {boolean}
   */
  unfinalizedBlocks?: boolean;

  /**
   * Indicates whether block skipping is enabled for the indexer (optional).
   * @type {boolean}
   */
  skipBlock?: boolean;
}

/**
 * Represents a parent project configuration.
 * @interface
 */
export interface ParentProject {
  /**
   * The block height at which to switch from the parent project to this project.
   * @type {number}
   * @description The block height to switch from the parent project to this project.
   */
  block: number;

  /**
   * The IPFS CID (Content Identifier) referencing the parent project.
   * @type {string}
   * @description The IPFS CID to the parent project.
   */
  reference: string;
}

export type TemplateBaseDs<DS extends BaseDataSource = BaseDataSource> = Omit<DS, 'startBlock'> & TemplateBase;

export interface ProjectManifestV1_0_0<
  D extends BaseDataSource = BaseDataSource,
  T extends TemplateBaseDs<D> = TemplateBaseDs<D>
> extends Omit<ProjectManifestV0_2_1<T, D>, 'network'> {
  dataSources: D[];
  runner: RunnerSpecs;
  templates?: T[];
  network: {
    chainId: string;
    endpoint?: string | string[];
    dictionary?: string;
    bypassBlocks?: (number | string)[];
    chaintypes?: {
      file: string;
    };
  };
  parent?: ParentProject;
}

export interface BlockFilter {
  modulo?: number;
  timestamp?: string;
}
