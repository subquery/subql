// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {ApiPromise} from '@polkadot/api';
import {
  SubqlDatasourceProcessor,
  SubqlCustomDatasource,
  SubqlHandlerKind,
  SubqlNetworkFilter,
  SubstrateEvent,
} from '@subql/types';

export interface EVMContractFilter extends SubqlNetworkFilter {
  address: string;
}

export type EVMDatasource = SubqlCustomDatasource<'substrate/MoonbeamEVM', EVMContractFilter>;

export const EVMDatasourcePlugin: SubqlDatasourceProcessor<'substrate/MoonbeamEVM', EVMContractFilter> = {
  kind: 'substrate/MoonbeamEVM',
  validate(ds: EVMDatasource): void {
    return;
  },
  dsFilterProcessor(ds: EVMDatasource, api: ApiPromise): boolean {
    return true;
  },
  handlerProcessors: {
    'substrate/MoonbeamEvmEvent': {
      // kind: 'substrate/AcalaEvmEvent',
      baseFilter: {module: 'evm', method: 'Log'},
      baseHandlerKind: SubqlHandlerKind.Event,
      transformer(original: SubstrateEvent, ds: EVMDatasource): void {
        console.log('');
      },
      filterProcessor(filter, input, ds) {
        return true;
      },
    },
  },
};
