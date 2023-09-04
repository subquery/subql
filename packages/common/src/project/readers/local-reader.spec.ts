// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import * as path from 'path';
import {Reader} from '@subql/types-core';
import {LocalReader} from './local-reader';
import {loadProjectFromScript} from './readerSandbox';

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

describe(' Load ts/js project', () => {
  it('could resolve ts project', () => {
    const root = path.join(__dirname, '../../../test/sandbox');
    const entry = './project.ts';
    const result = loadProjectFromScript(entry, root);
    expect((result as any).name).toBe('tsProject');
  });
  it('could resolve js project, could read chainTypes', () => {
    const root = path.join(__dirname, '../../../test/sandbox');
    const entry = './project.js';
    const result = loadProjectFromScript(entry, root);
    expect((result as any).name).toBe('tsProject');
    expect((result as any).network.chainTypes).toStrictEqual({file: './dist/chaintypes.js'});
  });
});
