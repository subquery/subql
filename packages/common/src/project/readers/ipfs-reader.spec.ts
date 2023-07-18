// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {IPFSReader} from './ipfs-reader';
import {Reader} from './reader';

const IPFSGateway = 'https://unauthipfs.subquery.network/ipfs/api/v0';

describe('IPFSReader', () => {
  let reader: Reader;

  it('should return a project deployment', async () => {
    reader = new IPFSReader('QmNbkA1fJpV2gCAWCBjgUQ8xBTwkLZHuzx4EkUoKx7VYaD', IPFSGateway);

    const data: any = await reader.getProjectSchema();

    expect(data.network.chainId).toBe('43114');
  });
});
