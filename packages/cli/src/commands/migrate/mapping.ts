// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Command, Flags} from '@oclif/core';

export default class Mapping extends Command {
  static description = 'Subgraph mapping to subquery mapping';

  static flags = {
    file: Flags.string({char: 'f', description: 'specify subgraph file/directory path'}),
    network: Flags.string({char: 'n', description: 'specify subgraph file/directory path', required: true}),
    output: Flags.string({char: 'o', description: 'Output subquery project path', required: false}),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Mapping);
    const {file, network, output} = flags;

    // TODO
  }
}
