// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {DictionaryQueryEntry} from './types';
import {BaseCustomDataSource} from './versioned';

/**
 * Maps a handler kind to the data type
 * @example {
 * 'block': BlockType,
 * 'transaction': TransactionType,
 * 'event': EventType,
 * }*/
export type HandlerInputMap = Record<string, any>;

export interface HandlerInputTransformer_0_0_0<
  IM extends HandlerInputMap,
  K extends keyof IM,
  DS extends BaseCustomDataSource,
  API,
  E // Output type
> {
  (input: IM[K], ds: DS, api: API, assets?: Record<string, string>): Promise<E>;
}

export interface HandlerInputTransformer_1_0_0<
  IM extends HandlerInputMap,
  K extends keyof IM,
  DS extends BaseCustomDataSource,
  API,
  F extends Record<string, unknown>,
  E // Output type
> {
  (params: {input: IM[K]; ds: DS; api: API; filter?: F; assets?: Record<string, string>}): Promise<E[]>;
}

// export interface HandlerInputTransformer_0_0_0<
//   T extends SubstrateHandlerKind,
//   E,
//   IT extends AnyTuple,
//   DS extends BaseCustomDataSource = SubstrateCustomDatasource
// > {
//   (input: RuntimeHandlerInputMap<IT>[T], ds: DS, api: ApiPromise, assets?: Record<string, string>): Promise<E>; //  | SubstrateBuiltinDataSource
// }

// export interface HandlerInputTransformer_1_0_0<
//   T extends SubstrateHandlerKind,
//   F extends Record<string, unknown>,
//   E,
//   IT extends AnyTuple,
//   DS extends BaseCustomDataSource = SubstrateCustomDatasource
// > {
//   (params: {
//     input: RuntimeHandlerInputMap<IT>[T];
//     ds: DS;
//     filter?: F;
//     api: ApiPromise;
//     assets?: Record<string, string>;
//   }): Promise<E[]>;
// }

// type SecondLayerHandlerProcessorArray<
//   K extends string,
//   F extends Record<string, unknown>,
//   T,
//   IT extends AnyTuple = AnyTuple,
//   DS extends BaseCustomDataSource<K> = SubstrateCustomDatasource<K>
// > =
//   | SecondLayerHandlerProcessor<SubstrateHandlerKind.Block, F, T, IT, DS>
//   | SecondLayerHandlerProcessor<SubstrateHandlerKind.Call, F, T, IT, DS>
//   | SecondLayerHandlerProcessor<SubstrateHandlerKind.Event, F, T, IT, DS>;

// export interface SubstrateDatasourceProcessor<
//   K extends string,
//   F extends Record<string, unknown>,
//   DS extends SubstrateCustomDatasource<K> = SubstrateCustomDatasource<K>,
//   P extends Record<string, SecondLayerHandlerProcessorArray<K, F, any, any, DS>> = Record<
//     string,
//     SecondLayerHandlerProcessorArray<K, F, any, any, DS>
//   >
// > {
//   kind: K;
//   validate(ds: DS, assets: Record<string, string>): void;
//   dsFilterProcessor(ds: DS, api: ApiPromise): boolean;
//   handlerProcessors: P;
// }

interface SecondLayerHandlerProcessorBase<
  IM extends HandlerInputMap,
  K extends keyof IM,
  F extends Record<string, unknown>,
  DS extends BaseCustomDataSource
> {
  baseHandlerKind: K;
  baseFilter: IM[K] | IM[K][];
  filterValidator: (filter?: F) => void;
  dictionaryQuery?: (filter: F, ds: DS) => DictionaryQueryEntry | undefined;
}

// only allow one custom handler for each baseHandler kind
export interface SecondLayerHandlerProcessor_0_0_0<
  IM extends HandlerInputMap,
  K extends keyof IM,
  F extends Record<string, unknown>,
  E,
  DS extends BaseCustomDataSource,
  API
> extends SecondLayerHandlerProcessorBase<IM, K, F, DS> {
  specVersion: undefined;
  transformer: HandlerInputTransformer_0_0_0<IM, K, DS, API, E>;
  filterProcessor: (filter: F | undefined, input: IM[K], ds: DS) => boolean;
}

export interface SecondLayerHandlerProcessor_1_0_0<
  IM extends HandlerInputMap,
  K extends keyof IM,
  F extends Record<string, unknown>,
  E,
  DS extends BaseCustomDataSource,
  API
> extends SecondLayerHandlerProcessorBase<IM, K, F, DS> {
  specVersion: '1.0.0';
  transformer: HandlerInputTransformer_1_0_0<IM, K, DS, API, F, E>;
  filterProcessor: (params: {filter: F | undefined; input: IM[K]; ds: DS}) => boolean;
}

export type SecondLayerHandlerProcessor<
  IM extends HandlerInputMap,
  K extends keyof IM,
  F extends Record<string, unknown>,
  E,
  DS extends BaseCustomDataSource,
  API
> = SecondLayerHandlerProcessor_0_0_0<IM, K, F, E, DS, API> | SecondLayerHandlerProcessor_1_0_0<IM, K, F, E, DS, API>;
