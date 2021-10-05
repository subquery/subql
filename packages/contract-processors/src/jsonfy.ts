// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {ApiPromise} from '@polkadot/api';
import {
  SubqlDatasourceProcessor,
  SubqlCustomDatasource,
  SubqlHandlerKind,
  SubqlNetworkFilter,
  SubstrateEvent,
  SubqlEventFilter,
} from '@subql/types';

export type JsonfyDatasource = SubqlCustomDatasource<'substrate/Jsonfy'>;

export const EVMDatasourcePlugin: SubqlDatasourceProcessor<'substrate/Jsonfy', SubqlNetworkFilter> = {
  kind: 'substrate/Jsonfy',
  validate(ds: JsonfyDatasource): void {
    return;
  },
  dsFilterProcessor(ds: JsonfyDatasource, api: ApiPromise): boolean {
    return true;
  },
  handlerProcessors: {
    'substrate/JsonfyEvent': {
      baseFilter: [],
      baseHandlerKind: SubqlHandlerKind.Event,
      transformer(original: SubstrateEvent, ds: JsonfyDatasource): Record<string, unknown> {
        return JSON.parse(JSON.stringify(original.toJSON()));
      },
      filterProcessor(filter: SubqlEventFilter, input: Record<string, unknown>, ds) {
        return (
          filter.module &&
          (input.event as any).section === filter.module &&
          filter.method &&
          (input.event as any).method === filter.method
        );
      },
    },
  },
};
