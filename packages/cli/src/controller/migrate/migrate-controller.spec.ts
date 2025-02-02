// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'fs';
import path from 'path';
import {makeTempDir, NETWORK_FAMILY} from '@subql/common';
import {extractGitInfo, getChainIdByNetworkName, improveProjectInfo, prepareProject} from './migrate-controller';
import {TestSubgraph} from './migrate.fixtures';

const testProjectPath = '../../../test/migrate/testProject';

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

    // should return result if user provide is a git subdirectory
    expect(extractGitInfo('https://github.com/gprotocol/g-tooling/tree/main/examples/ethereum-gravatar')).toStrictEqual(
      {
        link: 'https://github.com/gprotocol/g-tooling',
        branch: 'main',
      }
    );

    // IF not valid, should return undefined
    expect(extractGitInfo('https://google.com')).toBe(undefined);
  });

  it('should get chain id, getChainIdByNetworkName', () => {
    expect(getChainIdByNetworkName(NETWORK_FAMILY.ethereum, 'mainnet')).toBe('1');
    expect(() => getChainIdByNetworkName(NETWORK_FAMILY.ethereum, 'newnetwork')).toThrow();
    // not support yet
    expect(() => getChainIdByNetworkName(NETWORK_FAMILY.algorand, 'algorand')).toThrow();
  });

  it('prepareProject', async () => {
    const subqlDir = await makeTempDir();
    await prepareProject({chainId: '1', networkFamily: NETWORK_FAMILY.ethereum}, subqlDir);
    expect(fs.existsSync(path.join(subqlDir, 'project.ts'))).toBeTruthy();
    fs.rmSync(subqlDir, {recursive: true, force: true});

    const subqlDir2 = await makeTempDir();
    await expect(prepareProject({chainId: '2', networkFamily: NETWORK_FAMILY.ethereum}, subqlDir2)).rejects.toThrow();
    fs.rmSync(subqlDir2, {recursive: true, force: true});
  }, 100000);

  it('improveProjectInfo', () => {
    const testSubgraph = TestSubgraph;
    expect(TestSubgraph.name).toBeUndefined();
    improveProjectInfo(path.join(__dirname, testProjectPath), testSubgraph);
    expect(TestSubgraph.name).toBe('poap-mainnet-subquery');
    expect(TestSubgraph.repository).toBe('');
  });
});
