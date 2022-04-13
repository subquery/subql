// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { SpecVersionService } from './SpecVersions.service';

describe('SpecVersions', () => {
  let service: SpecVersionService;

  beforeEach(() => {
    service = new SpecVersionService();

    service.addSpecVersions({
      443964: 12,
      528471: 13,
      687752: 14,
      746086: 15,
    });
  });

  it('can find the correct spec versions', () => {
    expect(service.getSpecVersion(1)).toBe(undefined);
    expect(service.getSpecVersion(443964)).toBe(12);
    expect(service.getSpecVersion(687752)).toBe(14);
    expect(service.getSpecVersion(500000)).toBe(12);
  });
});
