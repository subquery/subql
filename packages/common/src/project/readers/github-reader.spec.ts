// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {GithubReader} from './github-reader';
import {Reader} from './reader';

describe('GithubReader', () => {
  let reader: Reader;

  beforeAll(() => {
    const key = 'subquery/tutorials-block-timestamp';
    reader = new GithubReader(key);
  });

  it('should return the package json object', async () => {
    const data = await reader.getPkg();
    expect(data.name).toBe('block-timestamp');
  });

  it('should return the project schema object', async () => {
    const data: any = await reader.getProjectSchema();
    expect(data.repository).toBe('https://github.com/subquery/subql-examples');
  });
});
