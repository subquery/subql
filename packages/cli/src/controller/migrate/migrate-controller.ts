// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'fs';
import path from 'path';
import {NETWORK_FAMILY} from '@subql/common';
import {cloneProjectTemplate, fetchExampleProjects} from '../init-controller';
import {graphNetworkNameChainId, subqlNetworkTemplateNetwork} from './constants';
import {ChainInfo, SubgraphProject} from './types';

// improve project info from the graph package json
export function improveProjectInfo(subgraphDir: string, subgraphManifest: SubgraphProject): void {
  const packageData = fs.readFileSync(`${subgraphDir}/package.json`);
  const thegraphPackage = JSON.parse(packageData.toString());
  subgraphManifest.name = thegraphPackage.name.replace('subgraph', 'subquery');
  subgraphManifest.author = thegraphPackage.author;
  subgraphManifest.description = subgraphManifest.description ?? thegraphPackage.description;
}

// Pull a network starter, as base project. Then mapping, manifest, schema can be overridden, copy over abi files
export async function prepareProject(chainInfo: ChainInfo, subqlDir: string): Promise<void> {
  const exampleProjects = await fetchExampleProjects(
    networkFamilyToTemplateNetwork(chainInfo.networkFamily),
    chainInfo.chainId
  );
  const templateProject = exampleProjects.find((p) => p.name.includes('-starter'));
  // Alternative approach: We can either do this, but require maintenance another template
  // const templateProject = subqlNetworkTemplateNetwork[chainInfo.networkFamily][chainInfo.chainId]
  if (!templateProject) {
    throw new Error(
      `Could not find subquery template for network ${chainInfo.networkFamily} chain ${chainInfo.chainId}`
    );
  }
  await cloneProjectTemplate(path.parse(subqlDir).dir, path.parse(subqlDir).name, templateProject);
}
//TODO, this might can be dynamic
export function getChainIdByNetworkName(networkFamily: NETWORK_FAMILY, chainName: string): string {
  const chainId = graphNetworkNameChainId[networkFamily][chainName];
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
