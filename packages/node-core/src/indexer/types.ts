// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {ProjectNetworkConfig, RunnerSpecs} from '@subql/common';
import {Entity} from '@subql/types';
import {GraphQLSchema} from 'graphql';

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

export interface ISubqueryProject<N extends IProjectNetworkConfig, DS = unknown, T = unknown, C = unknown> {
  id: string;
  root: string;
  network: Partial<N>;
  dataSources: DS[];
  schema: GraphQLSchema;
  templates: T[];
  chainTypes?: C;
  runner?: RunnerSpecs;
}

export interface IIndexerManager<B, DS> {
  start(): Promise<void>;
  indexBlock(
    block: B,
    datasources: DS[],
    ...args: any[]
  ): Promise<{dynamicDsCreated: boolean; operationHash: Uint8Array; reindexBlockHeight: number}>;
}
