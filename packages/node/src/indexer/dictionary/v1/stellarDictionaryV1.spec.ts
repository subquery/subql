// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { EventEmitter2 } from '@nestjs/event-emitter';
import { NETWORK_FAMILY } from '@subql/common';
import { DictionaryService, NodeConfig } from '@subql/node-core';
import {
  StellarDatasourceKind,
  StellarHandlerKind,
  SubqlRuntimeDatasource,
} from '@subql/types-stellar';
import { MetaData } from '@subql/utils';
import {
  StellarDictionaryV1,
  buildDictionaryQueryEntries,
} from './stellarDictionaryV1';

const nodeConfig = {
  dictionaryTimeout: 10000,
  dictionaryRegistry:
    'https://github.com/subquery/templates/raw/main/dist/dictionary.json',
} as NodeConfig;
const project = {
  network: {
    chainId: 'mainnet',
  },
} as any;

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

class TestDictionaryService extends DictionaryService<any, any> {
  async initDictionaries(): Promise<void> {
    return Promise.resolve(undefined);
  }
  async getRegistryDictionaries(chainId: string): Promise<string[]> {
    return this.resolveDictionary(
      NETWORK_FAMILY.near,
      chainId,
      this.nodeConfig.dictionaryRegistry,
    );
  }
}
describe('dictionary v1', () => {
  let dictionary: StellarDictionaryV1;
  beforeEach(async () => {
    const testDictionaryService = new TestDictionaryService(
      project.network.chainId,
      nodeConfig,
      new EventEmitter2(),
    );
    const dictionaryEndpoints =
      await testDictionaryService.getRegistryDictionaries(
        project.network.chainId,
      );
    dictionary = await StellarDictionaryV1.create(
      {
        network: {
          chainId: 'mainnet',
          dictionary: dictionaryEndpoints[1],
        },
      } as any,
      { dictionaryTimeout: 10000 } as NodeConfig,
      jest.fn(),
      dictionaryEndpoints[1], // use endpoint from network
    );
  });

  it('successfully validates metatada', () => {
    // start height from metadata
    expect(dictionary.startHeight).toBe(1);
    // further validation
    expect(
      (dictionary as any).dictionaryValidation(
        {
          lastProcessedHeight: 10000,
          targetHeight: 10000,
          chain: 'mainnet',
          genesisHash: 'EPnLgE7iEq9s7yTkos96M3cWymH5avBAPm3qx3NXqR8H=',
          startHeight: 1,
        } as MetaData,
        1,
      ),
    ).toBeTruthy();
  });
});
