// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import path from 'path';
import {NETWORK_FAMILY} from '@subql/common';
import {EthereumDatasourceKind} from '@subql/types-ethereum';
import {networkConverters} from '../constants';
import {SubgraphProject} from '../types';
import {
  extractNetworkFromManifest,
  readSubgraphManifest,
  subgraphDsToSubqlDs,
  subgraphTemplateToSubqlTemplate,
} from './migrate-manifest.controller';

const testProjectPath = '../../../../test/migrate/testProject';

describe('migrate manifest controller', () => {
  let subgraph: SubgraphProject;

  beforeEach(() => {
    subgraph = readSubgraphManifest(path.join(__dirname, testProjectPath, 'subgraph.yaml'), 'mockSubgraphPath');
  });

  it(`readSubgraphManifest from a given subgraph.yaml`, () => {
    expect(subgraph.schema).toStrictEqual({file: './schema.graphql'});
  });

  it(`subgraphDsToSubqlDs`, () => {
    const networkConverter = networkConverters[NETWORK_FAMILY.ethereum]!;
    expect(subgraphDsToSubqlDs(networkConverter.dsConverter, subgraph.dataSources)[0].startBlock).toBe(7844214);
    expect(subgraphDsToSubqlDs(networkConverter.dsConverter, subgraph.dataSources)[0].kind).toBe(
      EthereumDatasourceKind.Runtime
    );
    expect(subgraphDsToSubqlDs(networkConverter.dsConverter, subgraph.dataSources)[0].endBlock).toBeUndefined();
  });

  it(`subgraphTemplateToSubqlTemplate`, () => {
    const networkConverter = networkConverters[NETWORK_FAMILY.ethereum]!;

    const testTemplateDataSource = subgraph.dataSources;
    delete (testTemplateDataSource[0].source as any).address;
    delete (testTemplateDataSource[0].source as any).startBlock;
    expect(subgraphTemplateToSubqlTemplate(networkConverter.templateConverter, testTemplateDataSource)[0].name).toBe(
      'Poap'
    );
  });

  it(`extractNetworkFromManifest, should extract network info, throw if network not same`, () => {
    const chainInfo = extractNetworkFromManifest(subgraph);
    expect(chainInfo).toStrictEqual({networkFamily: NETWORK_FAMILY.ethereum, chainId: '1'});

    const mockPloygonDs = {...subgraph.dataSources[0]};
    mockPloygonDs.network = 'polygon';
    subgraph.dataSources.push(mockPloygonDs);
    expect(() => extractNetworkFromManifest(subgraph)).toThrow(
      `All network values in subgraph Networks should be the same. Got mainnet,polygon`
    );
  });

  it(`extractNetworkFromManifest, should throw if can not determine network family from ds`, () => {
    delete (subgraph.dataSources[0] as any).kind;
    expect(() => extractNetworkFromManifest(subgraph)).toThrow(`Subgraph dataSource kind or network not been found`);
  });
});
