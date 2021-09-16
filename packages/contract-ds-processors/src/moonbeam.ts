// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {ApiPromise} from '@polkadot/api';
import {
  SubqlDatasourcePlugin,
  SubqlCustomDatasource,
  SubqlHandlerKind,
  SubqlNetworkFilter,
  SubstrateEvent,
} from '@subql/types';

export interface EVMContractFilter extends SubqlNetworkFilter {
  address: string;
}

export type EVMDatasource = SubqlCustomDatasource<'substrate/Moonbeam-EVM', EVMContractFilter>;

export const EVMDatasourcePlugin: SubqlDatasourcePlugin<'substrate/Moonbeam-EVM', EVMContractFilter> = {
  kind: 'substrate/Moonbeam-EVM',
  validate(ds: EVMDatasource): void {
    return;
  },
  dsFilterProcessor(filter: SubqlNetworkFilter, api: ApiPromise, ds: EVMDatasource): boolean {
    return true;
  },
  handlerProcessors: {
    'substrate/AcalaEvmEvent': {
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
