// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {lstatSync} from 'fs';
import path from 'path';
import {Command, Flags} from '@oclif/core';
import cli from 'cli-ux';
import {DEFAULT_SUBGRAPH_SCHEMA, DEFAULT_SUBQL_SCHEMA} from '../../constants';
import {migrateSchema} from '../../controller/migrate';
import {getNetworkFamily} from '../../utils';

export default class Schema extends Command {
  static description = 'subgraph schema to subquery schema';

  static flags = {
    file: Flags.string({char: 'f', description: 'specify subgraph file/directory schema path'}),
    network: Flags.string({char: 'n', description: 'specify network', required: true}),
    output: Flags.string({char: 'o', description: 'Output subquery schema path', required: false}),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Schema);
    const {file, network, output} = flags;
    const networkFamily = getNetworkFamily(network);
    const subgraphSchemaPath = lstatSync(file).isDirectory() ? path.join(file, DEFAULT_SUBGRAPH_SCHEMA) : file;
    const subqlSchemaPath = lstatSync(output).isDirectory() ? path.join(file, DEFAULT_SUBQL_SCHEMA) : output;
    cli.action.start('Preparing migrate schema');
    await migrateSchema(networkFamily, subgraphSchemaPath, subqlSchemaPath);
    cli.action.stop();
  }
}
