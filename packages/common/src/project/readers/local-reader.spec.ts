// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import * as path from 'path';
import {LocalReader} from './local-reader';
import {Reader} from './reader';

describe('LocalReader', () => {
  let reader: Reader;

  beforeAll(() => {
    const loc = path.join(__dirname, '../../../fixtures');
    reader = new LocalReader(loc, path.resolve(loc, './project.yaml'));
  });

  it('should return the package json object', async () => {
    const data = await reader.getPkg();
    expect(data.name).toBe('subquery-starter');
  });

  it('should return the project schema object', async () => {
    const data: any = await reader.getProjectSchema();
    expect(data.repository).toBe('https://github.com/subquery/subql-starter');
  });
});
