// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import {NETWORK_FAMILY} from '@subql/common';
import {cloneProjectTemplate, fetchExampleProjects} from '../init-controller';
import {graphNetworkNameChainId} from './constants';
import {ChainInfo, SubgraphProject} from './types';

/**
 *
 * @param input is github link or ssh, or bitbucket link
 * return undefined if link not match any
 */
const githubLinkRegex = /^https:\/\/github\.com\/(?<domain>[^/]+)\/(?<repository>[^/]+)(?:\/tree\/(?<branch>[^/]+))?/;
const bitbucketLinkRegex =
  /^https:\/\/(?:[^/]+@)?bitbucket\.org\/(?<domain>[^/]+)\/(?<repository>[^/]+)(?:\/src\/(?<branch>[^/]+))?/;
const sshRegex = /^git@(?:bitbucket\.org|github\.com):[^/]+\/(?<repository>[^/]+)\.git$/;

export function extractGitInfo(input: string): {link: string; branch?: string} | undefined {
  const gitLinkMatch = input.match(githubLinkRegex);
  const bitBucketLinkMatch = input.match(bitbucketLinkRegex);
  const sshMatch = input.match(sshRegex);
  if (!gitLinkMatch && !sshMatch && !bitBucketLinkMatch) {
    return undefined;
  }
  const {branch, domain, repository} = gitLinkMatch?.groups || bitBucketLinkMatch?.groups || {};
  const link = sshMatch
    ? input
    : `https:${
        gitLinkMatch ? `//github.com` : bitBucketLinkMatch ? `//bitbucket.org` : undefined
      }/${domain}/${repository}`;
  return {link, branch};
}

// improve project info from the graph package json
export function improveProjectInfo(subgraphDir: string, subgraphManifest: SubgraphProject): void {
  const packageData = fs.readFileSync(`${subgraphDir}/package.json`);
  const thegraphPackage = JSON.parse(packageData.toString());
  subgraphManifest.name = thegraphPackage.name.replace('subgraph', 'subquery');
  subgraphManifest.author = thegraphPackage.author;
  subgraphManifest.description = subgraphManifest.description ?? thegraphPackage.description;
  subgraphManifest.repository = '';
}

// Pull a network starter, as base project. Then mapping, manifest, schema can be overridden, copy over abi files
export async function prepareProject(chainInfo: ChainInfo, subqlDir: string): Promise<void> {
  const exampleProjects = await fetchExampleProjects(
    networkFamilyToTemplateNetwork(chainInfo.networkFamily),
    chainInfo.chainId
  );
  const templateProject = exampleProjects.find((p) => p.name.includes('-starter'));
  if (!templateProject) {
    throw new Error(
      `Could not find subquery template for network ${chainInfo.networkFamily} chain ${chainInfo.chainId}`
    );
  }
  await cloneProjectTemplate(path.parse(subqlDir).dir, path.parse(subqlDir).name, templateProject);
}
//TODO, this might can be dynamic
export function getChainIdByNetworkName(networkFamily: NETWORK_FAMILY, chainName: string): string {
  const chainId = graphNetworkNameChainId[networkFamily]?.[chainName];
  if (!chainId) {
    throw new Error(`Could not find chainId for network ${networkFamily} chain ${chainName}`);
  }
  return chainId;
}

function networkFamilyToTemplateNetwork(networkFamily: NETWORK_FAMILY): string {
  switch (networkFamily) {
    case NETWORK_FAMILY.ethereum:
      return 'evm';
    default:
      // like polkadot/algorand
      return networkFamily.toLowerCase();
  }
}
