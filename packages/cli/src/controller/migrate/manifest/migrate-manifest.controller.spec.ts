// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import path from 'path';
import {NETWORK_FAMILY} from '@subql/common';
import {EthereumDatasourceKind} from '@subql/types-ethereum';
import {SubgraphProject} from '../types';
import {
  extractNetworkFromManifest,
  readSubgraphManifest,
  subgraphDsToSubqlDs,
  subgraphTemplateToSubqlTemplate,
} from './migrate-manifest.controller';

const testProjectPath = '../../../../test/migrate/testProject';

describe('migrate controller', () => {
  let subgraph: SubgraphProject;

  beforeEach(() => {
    subgraph = readSubgraphManifest(path.join(__dirname, testProjectPath, 'subgraph.yaml'));
  });

  it(`readSubgraphManifest from a given subgraph.yaml`, () => {
    expect(subgraph.schema).toStrictEqual({file: './schema.graphql'});
  });

  it(`subgraphDsToSubqlDs`, () => {
    expect(subgraphDsToSubqlDs(NETWORK_FAMILY.ethereum, subgraph.dataSources)[0].startBlock).toBe(7844214);
    expect(subgraphDsToSubqlDs(NETWORK_FAMILY.ethereum, subgraph.dataSources)[0].kind).toBe(
      EthereumDatasourceKind.Runtime
    );
    expect(subgraphDsToSubqlDs(NETWORK_FAMILY.ethereum, subgraph.dataSources)[0].endBlock).toBeUndefined();

    expect(() => subgraphDsToSubqlDs(NETWORK_FAMILY.algorand, subgraph.dataSources)[0].kind).toThrow();
  });

  it(`subgraphTemplateToSubqlTemplate`, () => {
    const testTemplateDataSource = subgraph.dataSources;
    delete testTemplateDataSource[0].source.address;
    delete testTemplateDataSource[0].source.startBlock;
    expect(subgraphTemplateToSubqlTemplate(NETWORK_FAMILY.ethereum, testTemplateDataSource)[0].name).toBe(
      'eth-template-name'
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
    delete subgraph.dataSources[0].kind;
    expect(() => extractNetworkFromManifest(subgraph)).toThrow(`Subgraph dataSource kind or network not been found`);
  });
});
