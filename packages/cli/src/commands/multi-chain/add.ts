// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import {input} from '@inquirer/prompts';
import {Command, Flags} from '@oclif/core';
import {addChain} from '../../controller/add-chain-controller';
import {resolveToAbsolutePath} from '../../utils';

export default class MultiChainAdd extends Command {
  static description = 'Add new chain manifest to multi-chain configuration';

  static flags = {
    multichain: Flags.string({char: 'f', description: 'specify multichain manifest file path', default: process.cwd()}),
    chainManifestPath: Flags.string({char: 'c', description: 'path to the new chain manifest'}),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(MultiChainAdd);

    const {multichain} = flags;
    let {chainManifestPath} = flags;

    if (!chainManifestPath) {
      chainManifestPath = await input({message: 'Enter the path to the new chain manifest'});
    }
    assert(chainManifestPath, 'Chain manifest path is required');

    await addChain(multichain, resolveToAbsolutePath(chainManifestPath));
  }
}
