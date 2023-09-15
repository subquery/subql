// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Reader} from '@subql/types-core';
import {GithubReader} from './github-reader';

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

describe('GithubReader with ts manifest', () => {
  let reader: Reader;

  beforeAll(() => {
    const key = 'jiqiang90/subql-starter';
    reader = new GithubReader(key);
  });

  it('should return the project schema object', async () => {
    const data: any = await reader.getProjectSchema();
    console.log(data.name);
    expect(data.name).toBe('tsProject');
  }, 500000); // load ts project with dependencies require sometime
});
