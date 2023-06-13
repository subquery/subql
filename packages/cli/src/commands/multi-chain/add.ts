// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Command, Flags} from '@oclif/core';
import {cli} from 'cli-ux';
import {addChain} from '../../controller/add-chain-controller';

export default class MultiChainAdd extends Command {
  static description = 'Add new chain manifest to multi-chain configuration';

  static flags = {
    multichain: Flags.string({char: 'f', description: 'specify multichain manifest file path', default: process.cwd()}),
    chainManifestPath: Flags.string({char: 'c', description: 'path to the new chain manifest'}),
    chainId: Flags.string({description: 'ID of the new chain'}),
  };

  async run() {
    const {flags} = await this.parse(MultiChainAdd);

    const {multichain} = flags;
    let {chainManifestPath} = flags;
    let {chainId} = flags;

    if (chainId) {
      this.log('Generating chain manifest from chain ID is not supported yet');
      chainId = undefined;
    }

    if (!chainManifestPath) {
      chainManifestPath = await cli.prompt('Enter the path to the new chain manifest');
    }

    await addChain(multichain, chainManifestPath, chainId);
  }
}
