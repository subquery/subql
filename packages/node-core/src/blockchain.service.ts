// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {BaseCustomDataSource, BaseDataSource, IProjectNetworkConfig} from '@subql/types-core';
import {DatasourceParams, Header, IBaseIndexerWorker, IBlock, ISubqueryProject} from './indexer';

// TODO probably need to split this in 2 to have a worker specific subset

export interface ICoreBlockchainService<
  DS extends BaseDataSource = BaseDataSource,
  SubQueryProject extends ISubqueryProject<IProjectNetworkConfig, DS> = ISubqueryProject<IProjectNetworkConfig, DS>
> {
  /* The semver of the node */
  packageVersion: string;

  // Project service
  onProjectChange(project: SubQueryProject): Promise<void> | void;
  /* Not all networks have a block timestamp, e.g. Shiden */
  getBlockTimestamp(height: number): Promise<Date | undefined>;
}

export interface IBlockchainService<
  DS extends BaseDataSource = BaseDataSource,
  CDS extends DS & BaseCustomDataSource = BaseCustomDataSource & DS,
  SubQueryProject extends ISubqueryProject<IProjectNetworkConfig, DS> = ISubqueryProject<IProjectNetworkConfig, DS>,
  SafeAPI = any,
  LightBlock = any,
  FullBlock = any,
  Worker extends IBaseIndexerWorker = IBaseIndexerWorker
> extends ICoreBlockchainService<DS, SubQueryProject> {
  blockHandlerKind: string;
  // TODO SubqueryProject methods

  // Block dispatcher service
  fetchBlocks(blockNums: number[]): Promise<IBlock<LightBlock>[] | IBlock<FullBlock>[]>; // TODO this probably needs to change to get light block type correct
  /* This is the worker equivalent of fetchBlocks, it provides a context to allow syncing anything between workers */
  fetchBlockWorker(worker: Worker, blockNum: number, context: {workers: Worker[]}): Promise<void>;

  // Project service
  // onProjectChange(project: SubQueryProject): Promise<void> | void;
  // /* Not all networks have a block timestamp, e.g. Shiden */
  // getBlockTimestamp(height: number): Promise<Date | undefined>;

  // Fetch service
  /**
   * The finalized header. If the chain doesn't have concrete finalization this could be a probablilistic finalization
   * */
  getFinalizedHeader(): Promise<Header>;
  /**
   * Gets the latest height of the chain, this should be unfinalized.
   * Or if the chain has instant finalization this would be the same as the finalized height.
   * */
  getBestHeight(): Promise<number>;
  /**
   *  The chain interval in milliseconds, if it is not consistent then provide a best estimate
   * */
  getChainInterval(): Promise<number>;

  // Unfinalized blocks
  getHeaderForHash(hash: string): Promise<Header>;
  getHeaderForHeight(height: number): Promise<Header>;

  // Dynamic Ds sevice
  /**
   * Applies and validates parameters to a template DS
   * */
  updateDynamicDs(params: DatasourceParams, template: DS | CDS): Promise<void>;

  isCustomDs: (x: DS | CDS) => x is CDS;
  isRuntimeDs: (x: DS | CDS) => x is DS;

  // Indexer manager
  /**
   * Gets an API instance to a specific height so any state queries return data as represented at that height.
   * */
  getSafeApi(block: LightBlock | FullBlock): Promise<SafeAPI>;
}
