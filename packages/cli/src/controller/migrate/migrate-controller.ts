// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'fs';
import path from 'path';
import {NETWORK_FAMILY} from '@subql/common';
import {cloneProjectTemplate, fetchExampleProjects} from '../init-controller';
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

/**
 * Determines if an input string is a valid git repository http or ssh url.
 * @param input a path or git url
 * @returns The link and branch if the input is a valid git repository url, otherwise undefined.
 */
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

export async function getChainIdByNetworkName(networkFamily: NETWORK_FAMILY, chainName: string): Promise<string> {
  const graphFamily = networkFamily.toLowerCase() === 'ethereum' ? 'eip155' : networkFamily.toLowerCase();
  const url = `https://raw.githubusercontent.com/graphprotocol/networks-registry/refs/heads/main/registry/${graphFamily}/${chainName}.json`;

  try {
    const res = await fetch(url);

    const data = (await res.json()) as {caip2Id: string};

    const [prefix, chainId] = data.caip2Id.split(':');

    if (!chainId) {
      // Should be re-caught and thrown below
      throw new Error('Invalid data');
    }

    return chainId;
  } catch (e) {
    throw new Error(`Could not find chainId for network ${networkFamily} chain ${chainName}`);
  }
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
