// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {ProjectNetworkConfig, RunnerSpecs} from '@subql/common';
import {Entity} from '@subql/types';
import {GraphQLSchema} from 'graphql';
import {ProcessBlockResponse} from './blockDispatcher';

export enum OperationType {
  Set = 'Set',
  Remove = 'Remove',
}

export type OperationEntity = {
  operation: OperationType;
  entityType: string;
  data: Entity | string;
};

export interface IProjectNetworkConfig extends ProjectNetworkConfig {
  chainId: string;
}

export interface ISubqueryProject<
  N extends IProjectNetworkConfig = IProjectNetworkConfig,
  DS = unknown,
  T = unknown,
  C = unknown
> {
  id: string;
  root: string;
  network: N;
  dataSources: DS[];
  schema: GraphQLSchema;
  templates: T[];
  chainTypes?: C;
  runner?: RunnerSpecs;
}

export interface IIndexerManager<B, DS> {
  start(): Promise<void>;
  indexBlock(block: B, datasources: DS[], ...args: any[]): Promise<ProcessBlockResponse>;
}

export interface IProjectService<DS> {
  blockOffset: number | undefined;
  reindex(lastCorrectHeight: number): Promise<void>;
  setBlockOffset(offset: number): Promise<void>;
  getAllDataSources(blockHeight: number): Promise<DS[]>;
}

// Equivalent to SubstrateDatasourceProcessor
export type DsProcessor<DS> = {
  kind: string;
  validate: (ds: DS, assets: Record<string, string>) => void;
  dsFilterProcessor: (ds: DS, api: any) => boolean;
  handlerProcessors: Record<string, any>;
};
