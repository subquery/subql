// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {lstatSync} from 'fs';
import path from 'path';
import {Command, Flags} from '@oclif/core';
import {NETWORK_FAMILY} from '@subql/common';
import cli from 'cli-ux';
import {DEFAULT_SUBGRAPH_MANIFEST, DEFAULT_SUBQL_MANIFEST} from '../../constants';
import {migrateManifest} from '../../controller/migrate';
import {getNetworkFamily} from '../../utils';

export default class Manifest extends Command {
  static description = 'subgraph manifest to subquery project';

  static flags = {
    file: Flags.string({char: 'f', description: 'specify subgraph file/directory manifest path'}),
    network: Flags.string({char: 'n', description: 'specify subgraph file/directory path', required: true}),
    output: Flags.string({char: 'o', description: 'Output subquery project path', required: false}),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Manifest);
    const {file, network, output} = flags;
    const networkFamily = getNetworkFamily(network);
    const subgraphManifestPath = lstatSync(file).isDirectory() ? path.join(file, DEFAULT_SUBGRAPH_MANIFEST) : file;
    const subqlManifestPath = lstatSync(output).isDirectory() ? path.join(file, DEFAULT_SUBQL_MANIFEST) : output;
    cli.action.start('Preparing migrate manifest');
    await migrateManifest(networkFamily, subgraphManifestPath, subqlManifestPath);
    cli.action.stop();
  }
}
