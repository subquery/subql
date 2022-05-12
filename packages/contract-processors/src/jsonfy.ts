// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {ApiPromise} from '@polkadot/api';
import {
  SubstrateDatasourceProcessor,
  SubstrateCustomDatasource,
  SubstrateHandlerKind,
  SubstrateNetworkFilter,
  SubstrateEventFilter,
  SecondLayerHandlerProcessor,
} from '@subql/types';

export type JsonfyDatasource = SubstrateCustomDatasource<'substrate/Jsonfy'>;

export const JsonfyDatasourcePlugin: SubstrateDatasourceProcessor<'substrate/Jsonfy', SubstrateNetworkFilter> = {
  kind: 'substrate/Jsonfy',
  validate(ds: JsonfyDatasource): void {
    return;
  },
  dsFilterProcessor(ds: JsonfyDatasource, api: ApiPromise): boolean {
    return true;
  },
  handlerProcessors: {
    'substrate/JsonfyEvent': <
      SecondLayerHandlerProcessor<
        SubstrateHandlerKind.Event,
        SubstrateEventFilter,
        Record<string, unknown>,
        JsonfyDatasource
      >
    >{
      specVersion: '1.0.0',
      baseFilter: [],
      baseHandlerKind: SubstrateHandlerKind.Event,
      // eslint-disable-next-line @typescript-eslint/require-await
      async transformer({input: original}): Promise<[Record<string, unknown>]> {
        return [JSON.parse(JSON.stringify(original.toJSON()))];
      },
      filterProcessor({filter, input}) {
        if (!filter) return true;
        return (
          filter.module &&
          input.event.section === filter.module &&
          filter.method &&
          input.event.method === filter.method
        );
      },
      filterValidator(filter: SubstrateEventFilter): void {
        return;
      },
    },
  },
};

export default JsonfyDatasourcePlugin;
