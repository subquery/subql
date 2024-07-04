// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {EthereumDatasourceKind} from '@subql/types-ethereum';
import {TestSubgraph} from '../migrate.fixtures';
import {convertEthereumDs, convertEthereumTemplate} from './ethereum';

describe('migrate eth manifest', () => {
  it(`convertEthereumDs`, () => {
    const testSubgraph = TestSubgraph;
    const subqlDs = testSubgraph.dataSources.map((ds) => convertEthereumDs(ds));
    expect(subqlDs.length).toBe(1);
    expect(subqlDs[0].kind).toBe(EthereumDatasourceKind.Runtime);
    expect(subqlDs[0].migrateDatasourceType).toBe('EthereumDatasourceKind.Runtime');
    expect(subqlDs[0].options).toStrictEqual({abi: 'Poap', address: '0x22C1f6050E56d2876009903609a2cC3fEf83B415'});
    expect(subqlDs[0].mapping.handlers[0].migrateHandlerType).toStrictEqual('EthereumHandlerKind.Event');
    expect(subqlDs[0].mapping.handlers[0].handler).toStrictEqual('handleEventToken');
    expect(subqlDs[0].mapping.handlers[0].filter).toStrictEqual({topics: ['EventToken(uint256,uint256)']});
    // converted handler should in same order
    expect(subqlDs[0].mapping.handlers[1].handler).toStrictEqual('handleTransfer');
  });

  it(`convertEthereumTemplate`, () => {
    const testTemplateDataSource = TestSubgraph.dataSources;

    delete (testTemplateDataSource[0].source as any).address;
    delete (testTemplateDataSource[0].source as any).startBlock;

    const subqlTemplate = convertEthereumTemplate(testTemplateDataSource[0]);
    expect(subqlTemplate.options?.address).toBeUndefined();
    expect(subqlTemplate.options?.abi).toBe('Poap');
    expect(subqlTemplate.assets?.get('Poap')).toBeTruthy();
  });
});
