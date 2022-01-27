// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import {GithubReader} from './github-reader';
import {IPFSReader} from './ipfs-reader';
import {LocalReader} from './local-reader';
import {ReaderFactory} from './reader';

describe('ReaderFactory', () => {
  it('should return the Github Reader', () => {
    const url = 'https://github.com/subquery/subql-starter';
    const reader = ReaderFactory.create(url);
    expect(reader instanceof GithubReader).toBeTruthy();
  });

  it('should return the Local Reader', () => {
    const loc = path.join(__dirname, '../../fixtures');
    const reader = ReaderFactory.create(loc);
    expect(reader instanceof LocalReader).toBeTruthy();
  });

  it('should return the IPFS Reader for a CID v0', () => {
    const loc = 'QmYyCCSaHLpPvZmex5ExHGdW7mavKYeiixVEyvNGwD1LLw';
    const reader = ReaderFactory.create(loc, {ipfs: 'https://ipfs.thechainhub.com/api/v0'});

    expect(reader instanceof IPFSReader).toBeTruthy();
  });

  it('should return the IPFS Reader for a CID v1', () => {
    const loc = 'bafybeie56fq7db5adfyt3afqwhje6pq2m77gn5ik6pg75bioger6kzjn6a';
    const reader = ReaderFactory.create(loc, {ipfs: 'https://ipfs.thechainhub.com/api/v0'});

    expect(reader instanceof IPFSReader).toBeTruthy();
  });
});
