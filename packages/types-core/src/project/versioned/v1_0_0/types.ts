// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {BaseDataSource, BaseTemplateDataSource} from '../base';

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
   * The version number of the indexer node.
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
   * The version number of the query service.
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
   * Indicates whether historical state tracking is enabled for the indexer (optional).
   * @type {boolean}
   * @default "true"
   */
  historical?: boolean;

  /**
   * Indicates whether unsafe mode are allowed for the indexer (optional).
   *
   * Unsafe mode controls various features that compromise the determinsm of a SubQuery project.
   * Unsafe allows any imports which greatly increases functionality with the tradeoff of decreased security
   * @type {boolean}
   * @default "false"
   */
  unsafe?: boolean;

  /**
   * Indicates whether unfinalized blocks are supported by the indexer (optional).
   *
   * This allows you to index blocks before they become finalized.
   * It can be very useful if you want the most up-to-date data possible.
   * It will detect any forks and remove any blocks that don't become finalized.
   * @type {boolean}
   * @default "false"
   */
  unfinalizedBlocks?: boolean;

  /**
   * Indicates whether transaction skipping is enabled for the indexer. (optional).
   * If this is enabled and the project only contains event handlers then it wont fetch transactions reducing memory footprint and RPC requests. This can lead to faster indexing.
   * @type {boolean}
   */
  skipTransactions?: boolean;
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

export interface ProjectManifestV1_0_0<
  D extends BaseDataSource = BaseDataSource,
  T extends BaseTemplateDataSource<D> = BaseTemplateDataSource<D>
> {
  name: string;
  version: string;
  schema: {
    file: string;
  };
  specVersion?: string;
  repository?: string;
  description?: string;
  templates?: T[];
  dataSources: D[];
  runner: RunnerSpecs;
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
