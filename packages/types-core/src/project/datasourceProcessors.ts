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
