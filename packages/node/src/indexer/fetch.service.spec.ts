// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {
  StellarDatasourceKind,
  StellarHandlerKind,
  SubqlRuntimeDatasource,
} from '@subql/types-stellar';
import { buildDictionaryQueryEntries } from './fetch.service';

describe('buildDictionaryQueryEntries', () => {
  it('should correctly build dictionary query entries for transactions', () => {
    const ds: SubqlRuntimeDatasource = {
      kind: StellarDatasourceKind.Runtime,
      startBlock: 1,
      mapping: {
        file: '',
        handlers: [
          {
            handler: 'handleTransactions',
            kind: StellarHandlerKind.Transaction,
            filter: {
              account: 'test_account',
            },
          },
        ],
      },
    };
    const result = buildDictionaryQueryEntries([ds]);
    expect(result).toEqual([
      {
        entity: 'transactions',
        conditions: [
          {
            field: 'account',
            value: 'test_account',
            matcher: 'equalTo',
          },
        ],
      },
    ]);
  });

  it('should correctly build dictionary query entries for operations', () => {
    const ds: SubqlRuntimeDatasource = {
      kind: StellarDatasourceKind.Runtime,
      startBlock: 1,
      mapping: {
        file: '',
        handlers: [
          {
            handler: 'handleOperations',
            kind: StellarHandlerKind.Operation,
            filter: {
              sourceAccount: 'source_account',
              type: 'operation_type',
            },
          } as any,
        ],
      },
    };
    const result = buildDictionaryQueryEntries([ds]);
    expect(result).toEqual([
      {
        entity: 'operations',
        conditions: [
          {
            field: 'type',
            value: 'operation_type',
            matcher: 'equalTo',
          },
          {
            field: 'sourceAccount',
            value: 'source_account',
            matcher: 'equalTo',
          },
        ],
      },
    ]);
  });

  it('should correctly build dictionary query entries for effects', () => {
    const ds: SubqlRuntimeDatasource = {
      kind: StellarDatasourceKind.Runtime,
      startBlock: 1,
      mapping: {
        file: '',
        handlers: [
          {
            handler: 'handleEffects',
            kind: StellarHandlerKind.Effects,
            filter: {
              account: 'effect_account',
              type: 'effect_type',
            },
          },
        ],
      },
    };
    const result = buildDictionaryQueryEntries([ds]);
    expect(result).toEqual([
      {
        entity: 'effects',
        conditions: [
          {
            field: 'type',
            value: 'effect_type',
            matcher: 'equalTo',
          },
          {
            field: 'account',
            value: 'effect_account',
            matcher: 'equalTo',
          },
        ],
      },
    ]);
  });

  it('should return an empty array when no filters are provided', () => {
    const ds: SubqlRuntimeDatasource = {
      kind: StellarDatasourceKind.Runtime,
      startBlock: 1,
      mapping: {
        file: '',
        handlers: [
          {
            handler: 'handleTransactions',
            kind: StellarHandlerKind.Transaction,
            filter: {},
          },
        ],
      },
    };
    const result = buildDictionaryQueryEntries([ds]);
    expect(result).toEqual([]);
  });
});
