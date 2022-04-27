// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {IPFSReader} from './ipfs-reader';
import {Reader} from './reader';

const IPFSGateway = 'https://interipfs.thechaindata.com/ipfs/api/v0';

describe('IPFSReader', () => {
  let reader: Reader;

  it('should return a project deployment', async () => {
    reader = new IPFSReader('Qmdwxos2aDv8KebrLcs2Y9uANJ5SFawagDwKgiogRrrUjM', IPFSGateway);

    const data: any = await reader.getProjectSchema();

    expect(data.network.genesisHash).toBe('0x91b171bb158e2d3848fa23a9f1c25182fb8e20313b2c1eb49219da7a70ce90c3');
  });
});
