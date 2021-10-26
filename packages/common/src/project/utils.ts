// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {SecondLayerHandlerProcessor, SubqlHandlerKind, SubqlNetworkFilter} from '@subql/types';

export function isBlockHandlerProcessor<T extends SubqlNetworkFilter, E>(
  hp: SecondLayerHandlerProcessor<SubqlHandlerKind, T, unknown>
): hp is SecondLayerHandlerProcessor<SubqlHandlerKind.Block, T, E> {
  return hp.baseHandlerKind === SubqlHandlerKind.Block;
}

export function isEventHandlerProcessor<T extends SubqlNetworkFilter, E>(
  hp: SecondLayerHandlerProcessor<SubqlHandlerKind, T, unknown>
): hp is SecondLayerHandlerProcessor<SubqlHandlerKind.Event, T, E> {
  return hp.baseHandlerKind === SubqlHandlerKind.Event;
}

export function isCallHandlerProcessor<T extends SubqlNetworkFilter, E>(
  hp: SecondLayerHandlerProcessor<SubqlHandlerKind, T, unknown>
): hp is SecondLayerHandlerProcessor<SubqlHandlerKind.Call, T, E> {
  return hp.baseHandlerKind === SubqlHandlerKind.Call;
}
