// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import {NodeConfig, readRawManifest, rebaseArgsWithManifest} from '@subql/node-core';

jest.setTimeout(30000);

describe('configure utils', () => {
  it('could rebase node args with manifest file ', async () => {
    const mockArgv = {
      ipfs: '',
      unsafe: true,
      batchSize: 500,
    } as any;

    const manifestPath = path.join(__dirname, '../../test/v1.0.0/project.yaml');
    const rawManifest = await readRawManifest(manifestPath, {
      ipfs: mockArgv.ipfs,
    });

    rebaseArgsWithManifest(mockArgv, rawManifest);

    // Fill the missing args
    expect(mockArgv.disableHistorical).toBeTruthy();
    // Keep the original value from argv
    expect(mockArgv.batchSize).toBe(500);
    // Args could override manifest options
    expect(mockArgv.unsafe).toBeTruthy();
  });
});
