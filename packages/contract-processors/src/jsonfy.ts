// Copyright 2020-2022 OnFinality Limited authors & contributors
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

export const JsonfyDatasourcePlugin: SubqlDatasourceProcessor<'substrate/Jsonfy', SubqlNetworkFilter> = {
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
      // eslint-disable-next-line @typescript-eslint/require-await
      async transformer(original: SubstrateEvent, ds: JsonfyDatasource): Promise<Record<string, unknown>> {
        return JSON.parse(JSON.stringify(original.toJSON()));
      },
      filterProcessor(filter: SubqlEventFilter, input: SubstrateEvent, ds: JsonfyDatasource) {
        return (
          filter.module &&
          input.event.section === filter.module &&
          filter.method &&
          input.event.method === filter.method
        );
      },
      filterValidator(filter: SubqlEventFilter): void {
        return;
      },
    },
  },
};

export default JsonfyDatasourcePlugin;
