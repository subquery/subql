// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {commonRules, RequireBuildScript, RequireCliDep, RequireCodegenScript} from './rules';
import {Validator} from './validator';

describe('Validator', () => {
  it('should validate the all', async () => {
    const url = 'https://github.com/subquery/subql-starter';
    const v = new Validator(url);
    v.addRule(...commonRules);
    const result = await v.validate();
    expect(result.length).toBe(5);
    expect(result.filter((r) => r.valid).length).toBe(5);
  });
});
