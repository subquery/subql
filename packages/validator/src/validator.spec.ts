// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {commonRules} from './rules';
import {Validator} from './validator';

describe('Validator', () => {
  let v: Validator;

  beforeAll(() => {
    const url = 'https://github.com/subquery/subql-starter';
    v = new Validator(url);
    v.addRule(...commonRules);
  });

  it('should validate get reports', async () => {
    const result = await v.getValidateReports();
    expect(result.length).toBe(6);
    expect(result.filter((r) => r.valid).length).toBe(6);
  });

  it('should return validate result', async () => {
    const result = await v.validate();
    expect(result).toBeTruthy();
  });
});
