// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {IPFSReader} from './ipfs-reader';
import {Reader} from './reader';

const IPFSGateway = 'https://ipfs.thechainhub.com/api/v0';

describe('IPFSReader', () => {
  let reader: Reader;

  it('should return a project schema object', async () => {
    reader = new IPFSReader('QmYyCCSaHLpPvZmex5ExHGdW7mavKYeiixVEyvNGwD1LLw', IPFSGateway);

    const data: any = await reader.getProjectSchema();

    expect(data.repository).toBe('https://github.com/subquery/subql-starter');
  });
});
