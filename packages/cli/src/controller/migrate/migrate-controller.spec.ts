// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {NETWORK_FAMILY} from '@subql/common';
import {extractGitInfo, getChainIdByNetworkName} from './migrate-controller';

describe('Migrate controller', () => {
  it('should able to extract git info from given link', () => {
    // git ssh should be same link
    expect(extractGitInfo('git@github.com:subquery/poap-benchmark.git')).toStrictEqual({
      link: 'git@github.com:subquery/poap-benchmark.git',
      branch: undefined,
    });
    // git link can extract git link, if branch is not provide should be undefined, so it can use default branch
    expect(extractGitInfo('https://github.com/subquery/poap-benchmark')).toStrictEqual({
      link: 'https://github.com/subquery/poap-benchmark',
      branch: undefined,
    });
    // can extract git branch
    expect(extractGitInfo('https://github.com/subquery/poap-benchmark/tree/test-branch')).toStrictEqual({
      link: 'https://github.com/subquery/poap-benchmark',
      branch: 'test-branch',
    });

    // bitbucket ssh
    expect(extractGitInfo('git@bitbucket.org:subquery/poap-benchmark.git')).toStrictEqual({
      link: 'git@bitbucket.org:subquery/poap-benchmark.git',
      branch: undefined,
    });
    // bitbucket link
    expect(extractGitInfo('https://bitbucket.org/subquery/poap-benchmark/')).toStrictEqual({
      link: 'https://bitbucket.org/subquery/poap-benchmark',
      branch: undefined,
    });
    // can extract bitbucket branch
    expect(extractGitInfo('https://bitbucket.org/subquery/poap-benchmark/src/test-branch')).toStrictEqual({
      link: 'https://bitbucket.org/subquery/poap-benchmark',
      branch: 'test-branch',
    });

    // IF not valid, should return undefined
    expect(extractGitInfo('https://google.com')).toBe(undefined);
  });

  it('should get chain id, getChainIdByNetworkName', () => {
    expect(getChainIdByNetworkName(NETWORK_FAMILY.ethereum, 'mainnet')).toBe('1');
    expect(getChainIdByNetworkName(NETWORK_FAMILY.ethereum, 'newnetwork')).toThrow();
    // not support yet
    expect(getChainIdByNetworkName(NETWORK_FAMILY.algorand, 'algorand')).toThrow();
  });

  it('prepareProject', () => {
    //TODO
  });

  it('improveProjectInfo', () => {
    //TODO
  });
});
