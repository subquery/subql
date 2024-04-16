// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {lstatSync} from 'fs';
import path from 'path';
import {Command, Flags} from '@oclif/core';
import cli from 'cli-ux';
import {
  DEFAULT_SUBGRAPH_MANIFEST,
  DEFAULT_SUBGRAPH_SCHEMA,
  DEFAULT_SUBQL_MANIFEST,
  DEFAULT_SUBQL_SCHEMA,
} from '../../constants';
import {migrateManifest, migrateSchema, prepareProject} from '../../controller/migrate';
import {getNetworkFamily} from '../../utils';

export default class Migrate extends Command {
  static description = 'Schema subgraph project to subquery project';

  static flags = {
    file: Flags.string({char: 'f', description: 'specify subgraph file/directory path'}),
    network: Flags.string({char: 'n', description: 'specify subgraph file/directory path', required: true}),
    output: Flags.string({char: 'o', description: 'Output subquery project path', required: false}),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Migrate);
    const {file: subgraphDir, network, output: subqlDir} = flags;
    const networkFamily = getNetworkFamily(network);

    if (!lstatSync(subgraphDir).isDirectory() || lstatSync(subqlDir).isDirectory()) {
      this.error('migrate from Subgraph failed, input and output path need to be directory');
    }

    const subgraphManifestPath = path.join(subgraphDir, DEFAULT_SUBGRAPH_MANIFEST);
    const subgraphSchemaPath = path.join(subgraphDir, DEFAULT_SUBGRAPH_SCHEMA);

    const subqlManifestPath = path.join(subqlDir, DEFAULT_SUBQL_MANIFEST);
    const subqlSchemaPath = path.join(subqlDir, DEFAULT_SUBQL_SCHEMA);
    cli.action.start('Preparing migrate project');
    try {
      await prepareProject(networkFamily, subqlDir);
      await migrateManifest(networkFamily, subgraphManifestPath, subqlManifestPath);
      await migrateSchema(networkFamily, subqlSchemaPath, subgraphSchemaPath);
      // await migrateMapping(network, subgraphManifestPath,subqlManifestPath)
    } catch (e) {
      this.error(`Migrate project failed: ${e}`);
    }
    cli.action.stop();
  }
}
