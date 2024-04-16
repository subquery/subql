// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'fs';
import path from 'path';
import {NETWORK_FAMILY} from '@subql/common';
import {CommonSubqueryProject} from '@subql/types-core';
import {upperFirst} from 'lodash';
import YAML from 'yaml';
import {SubgraphDataSource, SubgraphProject, SubgraphTemplate} from '../../../types';
import {renderTemplate} from '../../../utils';
import {DatasourceKind, TemplateKind} from '../../codegen-controller';
import {convertEthereumDs, convertEthereumTemplate} from './ethereum';

const PROJECT_TEMPLATE_PATH = path.resolve(__dirname, '../template/project.ts.ejs');

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
export async function migrateManifest(network: NETWORK_FAMILY, inputPath: string, outputPath: string) {
  // currently point to subgraph eth project only, can be expand by network
  const subgraphManifest: SubgraphProject = YAML.parse(fs.readFileSync(inputPath, 'utf8'));
  await renderManifest(outputPath, graphManifestToSubqlManifest(network, subgraphManifest));
}

/**
 * Convert the graph project to subquery project
 * @param network
 * @param subgraphManifest
 */
function graphManifestToSubqlManifest(
  network: NETWORK_FAMILY,
  subgraphManifest: SubgraphProject
): CommonSubqueryProject {
  return {
    network: {chainId: subgraphManifest.dataSources[0].network, endpoint: ''},
    name: subgraphManifest.description,
    specVersion: '1.0.0',
    version: subgraphManifest.specVersion,
    dataSources: subgraphDsToSubqlDs(network, subgraphManifest.dataSources),
    description: subgraphManifest.description,
    schema: subgraphManifest.schema,
    templates: subgraphManifest.templates
      ? subgraphTemplateToSubqlTemplate(network, subgraphManifest.templates)
      : undefined,
  };
}

export function subgraphTemplateToSubqlTemplate(
  network: NETWORK_FAMILY,
  subgraphTemplates: SubgraphTemplate[]
): TemplateKind[] {
  const convertFunction = networkTemplateConverters[network as NETWORK_FAMILY];
  return subgraphTemplates.map((t) => convertFunction(t));
}

export function subgraphDsToSubqlDs(network: NETWORK_FAMILY, subgraphDs: SubgraphDataSource[]): DatasourceKind[] {
  const convertFunction = networkDsConverters[network];
  return subgraphDs.map((ds) => convertFunction(ds));
}

// TODO, currently use DatasourceKind, which migrate network supported,should be a new type include all network dataSources
type DsConvertFunction = (ds: SubgraphDataSource) => DatasourceKind;
type TemplateConvertFunction = (ds: SubgraphTemplate) => TemplateKind;

// @ts-ignore
export const networkDsConverters: Record<NETWORK_FAMILY, DsConvertFunction> = {
  [NETWORK_FAMILY.ethereum]: convertEthereumDs,
  // [NETWORK_FAMILY.substrate]: convertSubstrateDs,
  // [NETWORK_FAMILY.cosmos]: convertCosmosDs,
  // [NETWORK_FAMILY.algorand]: convertAlgorandDs,
  // [NETWORK_FAMILY.flare]: convertFlareDs,
  // [NETWORK_FAMILY.near]: convertNearDs,
  // [NETWORK_FAMILY.stellar]: convertStellarDs,
  // [NETWORK_FAMILY.concordium]: convertConcordiumDs,
};

// @ts-ignore
const networkTemplateConverters: Record<NETWORK_FAMILY, TemplateConvertFunction> = {
  [NETWORK_FAMILY.ethereum]: convertEthereumTemplate,
  // [NETWORK_FAMILY.substrate]: convertSubstrateDs,
  // [NETWORK_FAMILY.cosmos]: convertCosmosDs,
  // [NETWORK_FAMILY.algorand]: convertAlgorandDs,
  // [NETWORK_FAMILY.flare]: convertFlareDs,
  // [NETWORK_FAMILY.near]: convertNearDs,
  // [NETWORK_FAMILY.stellar]: convertStellarDs,
  // [NETWORK_FAMILY.concordium]: convertConcordiumDs,
};
