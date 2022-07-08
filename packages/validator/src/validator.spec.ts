// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {IPFS_NODE_ENDPOINT, NETWORK_FAMILY} from '@subql/common';
import {commonRules, deploymentRules} from './rules';
import {Validator} from './validator';

describe('Validate project below manifest spec 1.0.0', () => {
  let v: Validator;
  const url = 'https://github.com/subquery/tutorials-block-timestamp';

  beforeAll(async () => {
    v = await Validator.create(url, null, NETWORK_FAMILY.substrate);
    v.addRule(...commonRules);
  });

  it('should throw error if manifest is below 1.0.0 and network is not provided', async () => {
    const v1 = await Validator.create(url);
    v1.addRule(...commonRules);
    await expect(v1.getValidateReports()).rejects.toThrow(/Can not identify project network under spec version 1.0.0/);
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

describe('Validate project with manifest spec 1.0.0, auto identify network', () => {
  it('should validate IPFS deployment', async () => {
    const cid = 'ipfs://QmVX1aaJRL9f5Vgjr8VJ9MWAcFHzAya9omnQ534JYCigCQ';
    const v = await Validator.create(cid, {ipfs: IPFS_NODE_ENDPOINT});
    v.addRule(...deploymentRules);
    const result = await v.getValidateReports();
    expect(result.filter((r) => r.valid).length).toBe(result.length);
  });

  it('should validate get reports', async () => {
    const url = 'https://github.com/subquery/cosmos-subql-starter';
    const v = await Validator.create(url);
    v.addRule(...commonRules);
    const result = await v.getValidateReports();
    expect(result.filter((r) => r.valid).length).toBe(result.length);
  });
});
