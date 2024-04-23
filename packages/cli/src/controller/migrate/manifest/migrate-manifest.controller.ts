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
import {graphToSubqlNetworkFamily, networkDsConverters, networkTemplateConverters} from '../constants';
import {getChainIdByNetworkName} from '../migrate-controller';
import {MigrateDatasourceKind, SubgraphDataSource, SubgraphProject, SubgraphTemplate, ChainInfo} from '../types';

const PROJECT_TEMPLATE_PATH = path.resolve(__dirname, '../../../template/project.ts.ejs');

export function readSubgraphManifest(inputPath: string): SubgraphProject {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Subgraph manifest ${inputPath} is not exist`);
  }
  const subgraphManifest: SubgraphProject = YAML.parse(fs.readFileSync(inputPath, 'utf8'));
  return subgraphManifest;
}

export function extractNetworkFromManifest(subgraphProject: SubgraphProject): ChainInfo {
  const firstDsKind = subgraphProject.dataSources[0].kind;
  const firstDsNetwork = subgraphProject.dataSources[0].network;
  if (!firstDsKind || !firstDsNetwork) {
    throw new Error(`Subgraph dataSource kind or network not been found`);
  }
  const networkFamily = graphToSubqlNetworkFamily[firstDsKind];
  if (!networkFamily) {
    throw new Error(`Corresponding subquery network is not find with subgraph data source kind ${firstDsKind}`);
  }
  return {networkFamily, chainId: getChainIdByNetworkName(networkFamily, subgraphProject.dataSources[0].network)};
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
    throw new Error(`When render project manifest having problems.`);
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
    repository: subgraphManifest.repository,
    templates: subgraphManifest.templates
      ? subgraphTemplateToSubqlTemplate(chainInfo.networkFamily, subgraphManifest.templates)
      : undefined,
  };
}

export function subgraphTemplateToSubqlTemplate(
  network: NETWORK_FAMILY,
  subgraphTemplates: SubgraphTemplate[]
): TemplateKind[] {
  const convertFunction = networkTemplateConverters[network as NETWORK_FAMILY];
  if (!convertFunction) {
    throw new Error(`When migration, unable find convert template method for ${network} `);
  }
  return subgraphTemplates.map((t) => convertFunction(t));
}

export function subgraphDsToSubqlDs(
  network: NETWORK_FAMILY,
  subgraphDs: SubgraphDataSource[]
): MigrateDatasourceKind[] {
  const convertFunction = networkDsConverters[network];
  if (!convertFunction) {
    throw new Error(`When migration, unable find convert dataSource method for ${network} `);
  }
  return subgraphDs.map((ds) => convertFunction(ds));
}
