// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import {Command, Flags} from '@oclif/core';
import {getProjectRootAndManifest} from '@subql/common';
import {
  abiPropType,
  generateScaffoldHandlers,
  getAllAbis,
  handlerPropType,
} from '../../controller/scaffoldgen-controller';

const ACCESS_TOKEN_PATH = path.resolve(process.env.HOME, '.subql/SUBQL_ACCESS_TOKEN');

export default class Generate extends Command {
  static description = 'Create Project on Hosted Service';

  static flags = {
    location: Flags.string({
      char: 'l',
      description: '[deprecated] local folder to run codegen in. please use file flag instead',
    }),
    file: Flags.string({char: 'f', description: 'specify manifest file path (will overwrite -l if both used)'}),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Generate);
    const {file, location} = flags;
    const projectPath = path.resolve(file ?? location ?? process.cwd());

    const {manifests, root} = getProjectRootAndManifest(projectPath);

    // li st all codegen generated
    // try {
    //   // for now just hard code stuff
    //   // but in future will update
    //   await Codegen.run(['-f', projectPath]);
    //
    //   // ensure codegen
    // } catch (e) {
    //   throw new Error(e);
    // }

    const handlerProps: handlerPropType[] = [
      {
        name: 'handleLog',
        argName: 'log',
        argType: 'TransferLog',
      },
      {
        name: 'handleTransaction',
        argName: 'tx',
        argType: 'ApproveTransaction',
      },
    ];

    const abisPropsMock: abiPropType[] = [
      {
        name: 'Erc20Abi',
        handlers: handlerProps,
      },
      {
        name: 'Erc721Abi',
        handlers: [
          {
            name: 'handleTotalSupply',
            argName: 'log',
            argType: 'TotalSupplyTransaction',
          },
        ],
      },
    ];

    const abiNames = getAllAbis(projectPath);
    const abisProps: abiPropType[] = abiNames.map((name) => {
      return {
        name,
        handlers: [...handlerProps],
      };
    });

    try {
      await generateScaffoldHandlers(abisProps, root);
    } catch (e) {
      throw new Error('Failing to generate scaffold');
    }
    // after a list of types is generated
    // under <root>/src/types/abi-interfaces

    // prompt a list based on the handlers set in the manifest file
    // for the amount of datasources

    // handleTransactions
    // filter approve()

    // handleLog
    // filter topics transfer()
  }
}
