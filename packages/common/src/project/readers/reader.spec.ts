// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import path from 'path';
import {GithubReader} from './github-reader';
import {IPFSReader} from './ipfs-reader';
import {LocalReader} from './local-reader';
import {ReaderFactory} from './reader';

const tarPath = path.join(__dirname, '/../../../test/mockedSubqueryProject.tgz');

describe('ReaderFactory', () => {
  it('should return the Github Reader', async () => {
    const url = 'https://github.com/subquery/subql-starter';
    const reader = await ReaderFactory.create(url);
    expect(reader instanceof GithubReader).toBeTruthy();
  });

  it('should return the Local Reader', async () => {
    const loc = path.join(__dirname, '../../../fixtures');
    const reader = await ReaderFactory.create(loc);
    expect(reader instanceof LocalReader).toBeTruthy();
  });

  it('should return the IPFS Reader for a CID v0', async () => {
    const loc = 'QmYyCCSaHLpPvZmex5ExHGdW7mavKYeiixVEyvNGwD1LLw';
    const reader = await ReaderFactory.create(loc, {ipfs: 'https://ipfs.thechainhub.com/api/v0'});

    expect(reader instanceof IPFSReader).toBeTruthy();
  });

  it('should return the IPFS Reader for a CID v1', async () => {
    const loc = 'bafybeie56fq7db5adfyt3afqwhje6pq2m77gn5ik6pg75bioger6kzjn6a';
    const reader = await ReaderFactory.create(loc, {ipfs: 'https://ipfs.thechainhub.com/api/v0'});
    expect(reader instanceof IPFSReader).toBeTruthy();
  });

  it.skip('should support archive files', async () => {
    const reader = await ReaderFactory.create(tarPath);
    const finalPath = reader.root;
    expect(fs.existsSync(finalPath)).toBeTruthy();
  });
});
