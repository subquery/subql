// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {SecondLayerHandlerProcessor, SubqlHandlerKind} from '@subql/types';

export function isBlockHandlerProcessor<T, E>(
  hp: SecondLayerHandlerProcessor<SubqlHandlerKind, unknown, unknown>
): hp is SecondLayerHandlerProcessor<SubqlHandlerKind.Block, T, E> {
  return hp.baseHandlerKind === SubqlHandlerKind.Block;
}

export function isEventHandlerProcessor<T, E>(
  hp: SecondLayerHandlerProcessor<SubqlHandlerKind, unknown, unknown>
): hp is SecondLayerHandlerProcessor<SubqlHandlerKind.Event, T, E> {
  return hp.baseHandlerKind === SubqlHandlerKind.Event;
}

export function isCallHandlerProcessor<T, E>(
  hp: SecondLayerHandlerProcessor<SubqlHandlerKind, unknown, unknown>
): hp is SecondLayerHandlerProcessor<SubqlHandlerKind.Call, T, E> {
  return hp.baseHandlerKind === SubqlHandlerKind.Call;
}
