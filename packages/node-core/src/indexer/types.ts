// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {
  BaseDataSource,
  BaseTemplateDataSource,
  CommonSubqueryProject,
  Entity,
  IProjectNetworkConfig,
} from '@subql/types-core';
import {GraphQLSchema} from 'graphql';
import {BlockHeightMap} from '../utils/blockHeightMap';
import {ProcessBlockResponse} from './blockDispatcher';

export interface ISubqueryProject<
  N extends IProjectNetworkConfig = IProjectNetworkConfig,
  DS extends BaseDataSource = BaseDataSource,
  T extends BaseTemplateDataSource<DS> = BaseTemplateDataSource<DS>,
  C = unknown
> extends Omit<CommonSubqueryProject<N, DS, T>, 'schema' | 'version' | 'name' | 'specVersion' | 'description'> {
  readonly schema: GraphQLSchema;
  applyCronTimestamps: (getBlockTimestamp: (height: number) => Promise<Date>) => Promise<void>;
  readonly id: string;
  chainTypes?: C; // The chainTypes after loaded
  readonly root: string;
}

export enum OperationType {
  Set = 'Set',
  Remove = 'Remove',
}

export type OperationEntity = {
  operation: OperationType;
  entityType: string;
  data: Entity | string;
};

export interface IIndexerManager<B, DS> {
  indexBlock(block: B, datasources: DS[], ...args: any[]): Promise<ProcessBlockResponse>;
}

export interface IProjectService<DS> {
  blockOffset: number | undefined;
  startHeight: number;
  reindex(lastCorrectHeight: number): Promise<void>;
  getAllDataSources(): DS[];
  getDataSources(blockHeight?: number): Promise<DS[]>;
  getStartBlockFromDataSources(): number;
  getDataSourcesMap(): BlockHeightMap<DS[]>;
  hasDataSourcesAfterHeight(height: number): boolean;
}
