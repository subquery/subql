// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {NodeConfig} from '@subql/node-core/configure';
import {BlockHeightMap} from '@subql/node-core/utils';
import {SubstrateDatasourceKind, SubstrateHandlerKind} from '@subql/types';
import {DictionaryQueryEntry} from '@subql/types-core';
import {IBlock} from '../types';
import {DictionaryResponse} from './types';
import {DictionaryV1} from './v1';
import {DictionaryV2, DictionaryV2QueryEntry, RawDictionaryResponseData} from './v2';

// export use in dictionary service test
export class TestDictionaryV1 extends DictionaryV1<any> {
  constructor(endpoint: string, chainId: string, nodeConfig: NodeConfig, private queryEntry: DictionaryQueryEntry[]) {
    super(endpoint, chainId, nodeConfig);
  }

  buildDictionaryQueryEntries(dataSources: any[]): DictionaryQueryEntry[] {
    return this.queryEntry;
  }
}

export const mockDS = [
  {
    name: 'runtime',
    kind: SubstrateDatasourceKind.Runtime,
    startBlock: 100,
    mapping: {
      handlers: [
        {
          handler: 'handleTest',
          kind: SubstrateHandlerKind.Event,
          filter: {
            module: 'balances',
            method: 'Deposit',
          },
        },
      ],
      file: '',
    },
  },
  {
    name: 'runtime',
    kind: SubstrateDatasourceKind.Runtime,
    startBlock: 500,
    mapping: {
      handlers: [
        {
          handler: 'handleTest',
          kind: SubstrateHandlerKind.Call,
          filter: {
            module: 'balances',
            method: 'Deposit',
            success: true,
          },
        },
      ],
      file: '',
    },
  },
  {
    name: 'runtime',
    kind: SubstrateDatasourceKind.Runtime,
    startBlock: 1000,
    mapping: {
      handlers: [
        {
          handler: 'handleTest',
          kind: SubstrateHandlerKind.Call,
          filter: {
            module: 'balances',
            method: 'Deposit',
            success: true,
          },
        },
      ],
      file: '',
    },
  },
];

const m = new Map<number, any>();

mockDS.forEach((ds, index, dataSources) => {
  m.set(ds.startBlock, dataSources.slice(0, index + 1));
});

// eslint-disable-next-line jest/no-export
export const dsMap = new BlockHeightMap(m);

export interface TestFB {
  gasLimit: bigint;
  gasUsed: bigint;
  hash: string;
}

export class TestDictionaryV2 extends DictionaryV2<TestFB, any, any> {
  buildDictionaryQueryEntries(dataSources: any[]): DictionaryV2QueryEntry {
    return {};
  }

  convertResponseBlocks<RFB>(result: RawDictionaryResponseData<RFB>): DictionaryResponse<IBlock<TestFB>> | undefined {
    return {
      batchBlocks: result.blocks as IBlock<TestFB>[],
      lastBufferedHeight: (result.blocks as number[])[result.blocks.length - 1],
    };
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async mockInit(): Promise<void> {
    (this as any).init = () => Promise.resolve();
    this._metadata = {
      start: 1,
      end: 100000,
      chainId: 'mockChainId',
      genesisHash: '0x21121',
      filters: {
        complete: ['block', 'transaction'],
      },
      supported: ['complete'],
    };

    this.setDictionaryStartHeight(this._metadata.start);
  }
}
