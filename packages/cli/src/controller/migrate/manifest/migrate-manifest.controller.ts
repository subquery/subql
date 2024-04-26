// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'fs';
import path from 'path';
import {NETWORK_FAMILY} from '@subql/common';
import {CommonSubqueryProject} from '@subql/types-core';
import {upperFirst} from 'lodash';
import YAML from 'yaml';
import {findRunnerByNetworkFamily, prepareDirPath, renderTemplate} from '../../../utils';
import {TemplateKind} from '../../codegen-controller';
import {graphToSubqlNetworkFamily, networkConverters} from '../constants';
import {getChainIdByNetworkName} from '../migrate-controller';
import {MigrateDatasourceKind, SubgraphDataSource, SubgraphProject, SubgraphTemplate, ChainInfo} from '../types';

const PROJECT_TEMPLATE_PATH = path.resolve(__dirname, '../../../template/project.ts.ejs');

export function readSubgraphManifest(inputPath: string): SubgraphProject {
  try {
    const subgraphManifest: SubgraphProject = YAML.parse(fs.readFileSync(inputPath, 'utf8'));
    return subgraphManifest;
  } catch (e) {
    if (e.code === 'ENOENT') {
      throw new Error(`Unable to find subgraph manifest at: ${inputPath}`);
    }
  }
}

export function extractNetworkFromManifest(subgraphProject: SubgraphProject): ChainInfo {
  const subgraphDsKinds = subgraphProject.dataSources.map((d) => d.kind).filter((k) => k !== undefined);
  const subgraphDsNetworks = subgraphProject.dataSources.map((d) => d.network).filter((n) => n !== undefined);
  if (!subgraphDsKinds.length || !subgraphDsNetworks.length) {
    throw new Error(`Subgraph dataSource kind or network not been found`);
  }
  if (!subgraphDsNetworks.every((network) => network === subgraphDsNetworks[0])) {
    throw new Error(`All network values in subgraph Networks should be the same. Got ${subgraphDsNetworks}`);
  }
  const firstDsKind = subgraphDsKinds[0];
  const firstDsNetwork = subgraphDsNetworks[0];
  const networkFamily = graphToSubqlNetworkFamily[firstDsKind];
  if (!networkFamily) {
    throw new Error(`Corresponding subquery network is not find with subgraph data source kind ${firstDsKind}`);
  }
  return {networkFamily, chainId: getChainIdByNetworkName(networkFamily, firstDsNetwork)};
}

/**
 * Render subquery project to .ts file
 * @param projectPath
 * @param project
 */
export async function renderManifest(projectPath: string, project: CommonSubqueryProject): Promise<void> {
  try {
    await renderTemplate(PROJECT_TEMPLATE_PATH, projectPath, {
      props: {
        importTypes: {
          network: 'ethereum',
          projectClass: 'EthereumProject',
          projectDatasourceKind: 'EthereumDatasourceKind',
          projectHandlerKind: 'EthereumHandlerKind',
        },
        projectJson: project,
      },
      helper: {
        upperFirst,
      },
    });
  } catch (e) {
    throw new Error(`Failed to create project manifest, ${e}`);
  }
}

/**
 *  Migrate a subgraph project manifest to subquery manifest file
 * @param network network family
 * @param inputPath file path to subgraph.yaml
 * @param outputPath file path to project.ts
 */
export async function migrateManifest(chainInfo: ChainInfo, subgraphManifest: SubgraphProject, outputPath: string) {
  await prepareDirPath(outputPath, false);
  await renderManifest(outputPath, graphManifestToSubqlManifest(chainInfo, subgraphManifest));
}

/**
 * Convert the graph project to subquery project
 * @param network
 * @param subgraphManifest
 */
function graphManifestToSubqlManifest(chainInfo: ChainInfo, subgraphManifest: SubgraphProject): CommonSubqueryProject {
  return {
    network: {chainId: chainInfo.chainId, endpoint: ''},
    name: subgraphManifest.name,
    specVersion: '1.0.0',
    runner: {
      node: {version: '^', name: findRunnerByNetworkFamily(chainInfo.networkFamily)},
      query: {version: '^', name: '@subql/query'},
    },
    version: subgraphManifest.specVersion,
    dataSources: subgraphDsToSubqlDs(chainInfo.networkFamily, subgraphManifest.dataSources),
    description: subgraphManifest.description,
    schema: subgraphManifest.schema,
    repository: '',
    templates: subgraphManifest.templates
      ? subgraphTemplateToSubqlTemplate(chainInfo.networkFamily, subgraphManifest.templates)
      : undefined,
  };
}

export function subgraphTemplateToSubqlTemplate(
  network: NETWORK_FAMILY,
  subgraphTemplates: SubgraphTemplate[]
): TemplateKind[] {
  const convertFunction = networkConverters[network as NETWORK_FAMILY].templateConverter;
  if (!convertFunction) {
    throw new Error(`${network} does not support migration of templates.`);
  }
  return subgraphTemplates.map((t) => convertFunction(t));
}

export function subgraphDsToSubqlDs(
  network: NETWORK_FAMILY,
  subgraphDs: SubgraphDataSource[]
): MigrateDatasourceKind[] {
  const convertFunction = networkConverters[network].dsConverter;
  if (!convertFunction) {
    throw new Error(`${network} is not supported with migrations`);
  }
  return subgraphDs.map((ds) => convertFunction(ds));
}
