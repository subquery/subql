// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import path from 'path';
import {ReaderFactory} from '@subql/common';
import {rebaseArgsWithManifest} from '../utils/configure';

jest.setTimeout(30000);

describe('configure utils', () => {
  it('could rebase node args with manifest file', async () => {
    const mockArgv = {
      ipfs: '',
      unsafe: false,
      batchSize: 500,
    } as any;

    const manifestPath = path.join(__dirname, '../../test/v1.0.0/projectOptions.yaml');
    const reader = await ReaderFactory.create(manifestPath);
    const rawManifest = await reader.getProjectSchema();

    rebaseArgsWithManifest(mockArgv, rawManifest);

    // Fill the missing args, in manifest runner historical is enabled
    expect(mockArgv.disableHistorical).toBeUndefined();
    expect(mockArgv.historical).toBeTruthy();
    // Keep the original value from argv
    expect(mockArgv.batchSize).toBe(500);
    // Args could override manifest options
    expect(mockArgv.unsafe).toBeFalsy();
  });

  it('should rebase historical manifest options', () => {
    const mock = {
      historical: 'height',
    } as any;

    rebaseArgsWithManifest(mock, {runner: {node: {options: {historical: true}}}});
    expect(mock.historical).toBe('height');

    rebaseArgsWithManifest(mock, {runner: {node: {options: {historical: false}}}});
    expect(mock.historical).toBe(false);

    rebaseArgsWithManifest(mock, {runner: {node: {options: {historical: 'height'}}}});
    expect(mock.historical).toBe('height');

    rebaseArgsWithManifest(mock, {runner: {node: {options: {historical: 'timestamp'}}}});
    expect(mock.historical).toBe('timestamp');

    expect(mock.disableHistorical).toBeUndefined();
  });
});
