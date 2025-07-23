// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {BaseCustomDataSource, BaseDataSource, IProjectNetworkConfig} from '@subql/types-core';
import {DatasourceParams, Header, IBaseIndexerWorker, IBlock, ISubqueryProject} from './indexer';

export interface ICoreBlockchainService<
  DS extends BaseDataSource = BaseDataSource,
  SubQueryProject extends ISubqueryProject<IProjectNetworkConfig, DS> = ISubqueryProject<IProjectNetworkConfig, DS>,
> {
  /* The semver of the node */
  packageVersion: string;

  // Project service
  onProjectChange(project: SubQueryProject): Promise<void> | void;
  /* Not all networks have a block timestamp, e.g. Shiden need to request one more get */
  getBlockTimestamp(height: number): Promise<Date>;

  getHeaderForHeight(height: number): Promise<Header>;
}

export interface IBlockchainService<
  DS extends BaseDataSource = BaseDataSource,
  CDS extends DS & BaseCustomDataSource = DS & BaseCustomDataSource,
  SubQueryProject extends ISubqueryProject<IProjectNetworkConfig, DS> = ISubqueryProject<IProjectNetworkConfig, DS>,
  SafeAPI = any,
  LightBlock = any,
  FullBlock = any,
  Worker extends IBaseIndexerWorker = IBaseIndexerWorker,
> extends ICoreBlockchainService<DS, SubQueryProject> {
  blockHandlerKind: string;

  // Block dispatcher service
  fetchBlocks(blockNums: number[]): Promise<IBlock<LightBlock>[] | IBlock<FullBlock>[]>; // TODO this probably needs to change to get light block type correct
  /* This is the worker equivalent of fetchBlocks, it provides a context to allow syncing anything between workers */
  fetchBlockWorker(worker: Worker, blockNum: number, context: {workers: Worker[]}): Promise<Header>;

  // /* Not all networks have a block timestamp, e.g. Shiden */
  // getBlockTimestamp(height: number): Promise<Date | undefined>;

  // Block dispatcher
  /* Gets the size of the block, used to calculate a median */
  getBlockSize(block: IBlock): number;

  // Fetch service
  /**
   * The finalized header. If the chain doesn't have concrete finalization this could be a probabilistic finalization
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
