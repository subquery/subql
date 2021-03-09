// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import {GithubReader} from './github-reader';
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
});
