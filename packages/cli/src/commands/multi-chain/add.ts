// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Command, Flags} from '@oclif/core';
import {addChain} from '../../controller/add-chain-controller';

export default class MultiChainAdd extends Command {
  static description = 'Add new chain manifest to multi-chain configuration';

  static flags = {
    multichain: Flags.string({char: 'm', description: 'specify multichain manifest file path'}),
    chainManifestPath: Flags.string({char: 'f', description: 'path to the new chain manifest'}),
    chainId: Flags.string({char: 'c', description: 'ID of the new chain'}),
    schema: Flags.string({char: 's', description: 'specify schema path for the new chain manifest'}),
  };

  async run() {
    const {flags} = await this.parse(MultiChainAdd);
    const {chainId, chainManifestPath, multichain, schema} = flags;

    addChain(multichain, chainManifestPath, chainId, schema);
  }
}
