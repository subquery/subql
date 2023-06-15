// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {
  EthereumDatasourceKind,
  EthereumHandlerKind,
  SubqlRuntimeDatasource,
} from '@subql/types-ethereum';
import { buildDictionaryQueryEntries } from './fetch.service';

describe('Dictioanry queries', () => {
  describe('Transaction filters', () => {
    it('Build a filter for contract creation transactions', () => {
      const ds: SubqlRuntimeDatasource = {
        kind: EthereumDatasourceKind.Runtime,
        assets: new Map(),
        startBlock: 1,
        mapping: {
          file: '',
          handlers: [
            {
              handler: 'handleTransaction',
              kind: EthereumHandlerKind.Call,
              filter: {
                to: null,
              },
            },
          ],
        },
      };

      const result = buildDictionaryQueryEntries([ds], 1);

      expect(result).toEqual([
        {
          entity: 'evmTransactions',
          conditions: [{ field: 'to', matcher: 'isNull', value: true }],
        },
      ]);
    });
  });
});
