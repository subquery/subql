// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {NETWORK_FAMILY} from '@subql/common';
import {commonRules} from './rules';
import {Validator} from './validator';

describe('Validator', () => {
  let v: Validator;

  beforeAll(async () => {
    const url = 'https://github.com/subquery/tutorials-block-timestamp';
    v = await Validator.create(url, null, NETWORK_FAMILY.substrate);
    v.addRule(...commonRules);
  });

  it('should validate get reports', async () => {
    const result = await v.getValidateReports();
    expect(result.filter((r) => r.valid).length).toBe(result.length);
  });

  it('should return validate result', async () => {
    const result = await v.validate();
    expect(result).toBeTruthy();
  });
});
