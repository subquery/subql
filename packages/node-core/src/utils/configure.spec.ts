// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import {ReaderFactory} from '@subql/common';
import {rebaseArgsWithManifest} from '@subql/node-core';

jest.setTimeout(30000);

describe('configure utils', () => {
  it('could rebase node args with manifest file ', async () => {
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
    expect(mockArgv.disableHistorical).toBeFalsy();
    // Keep the original value from argv
    expect(mockArgv.batchSize).toBe(500);
    // Args could override manifest options
    expect(mockArgv.unsafe).toBeFalsy();
  });
});
