// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {colorizeLevel} from './colors';

describe('LoggerColorLevel', () => {
  it('returns default for an unsupported level number', () => {
    const level = colorizeLevel(5);
    expect(level).toBe('\x1b[37mUSERLVL\x1b[39m');
  });

  it('returns the correct level for a level number', () => {
    const level = colorizeLevel(60);
    expect(level).toBe('\x1b[41mFATAL\x1b[49m');
  });
});
