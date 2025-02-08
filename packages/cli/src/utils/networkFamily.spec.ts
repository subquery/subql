// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {NETWORK_FAMILY} from '@subql/common';
import {getNetworkFamily} from './networkFamily';

describe('Get network family', () => {
  it('convert input to right network family', () => {
    expect(getNetworkFamily('ethereum')).toBe(NETWORK_FAMILY.ethereum);
    expect(getNetworkFamily('Ethereum')).toBe(NETWORK_FAMILY.ethereum);
    expect(() => getNetworkFamily('fakeNetwork')).toThrow(`Network not found or unsupported network fakeNetwork`);
  });
});
