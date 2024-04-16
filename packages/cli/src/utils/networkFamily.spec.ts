// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {existsSync, readFileSync, writeFileSync} from 'fs';
import path from 'path';
import {NETWORK_FAMILY} from '@subql/common';
import {MultichainProjectManifest} from '@subql/types-core';
import * as yaml from 'js-yaml';
import rimraf from 'rimraf';
import {buildManifestFromLocation} from './build';
import {getNetworkFamily} from './networkFamily';

describe('Get network family', () => {
  it('convert input to right network family', () => {
    expect(getNetworkFamily('ethereum')).toBe(NETWORK_FAMILY.ethereum);
    expect(getNetworkFamily('Ethereum')).toBe(NETWORK_FAMILY.ethereum);
    expect(() => getNetworkFamily('fakeNetwork')).toThrow(`Network not found or unsupported network fakeNetwork`);
  });
});
