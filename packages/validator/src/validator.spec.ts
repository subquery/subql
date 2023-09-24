// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {IPFS_NODE_ENDPOINT, NETWORK_FAMILY} from '@subql/common';
import {commonRules, deploymentRules} from './rules';
import {Validator} from './validator';

describe('Validate project with manifest spec 1.0.0, auto identify network', () => {
  it('should validate IPFS deployment', async () => {
    const cid = 'ipfs://QmVX1aaJRL9f5Vgjr8VJ9MWAcFHzAya9omnQ534JYCigCQ';
    const v = await Validator.create(cid, {ipfs: IPFS_NODE_ENDPOINT});
    v.addRule(...deploymentRules);
    const result = await v.getValidateReports();
    expect(result.filter((r) => r.valid).length).toBe(result.length);
  });

  it('should validate get reports', async () => {
    const url = 'https://github.com/subquery/tutorials-frontier-evm-starter';
    const v = await Validator.create(url);
    v.addRule(...commonRules);
    const result = await v.getValidateReports();
    expect(result.filter((r) => r.valid).length).toBe(result.length);
  });
});
