// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import path from 'path';
import {getBuildEntries, loadTsConfig} from './build-controller';

describe('build controller', () => {
  it('picks up test and export files', () => {
    const dir = path.resolve(__dirname, '../../test/build');

    const entries = getBuildEntries(dir);

    expect(entries['test/mappingHandler.test']).toEqual(path.resolve(dir, './src/test/mappingHandler.test.ts'));
    expect(entries.chaintypes).toEqual(path.resolve(dir, './src/chainTypes.ts'));
  });

  it('loads tsconfig in json format', () => {
    const config = loadTsConfig(path.resolve(__dirname, '../../test/build'));
    expect(config).toBeDefined();
  });

  it('loads tsconfig in jsonc format', () => {
    const config = loadTsConfig(path.resolve(__dirname, '../../test/jsoncConfig'));
    expect(config).toBeDefined();
  });
});
