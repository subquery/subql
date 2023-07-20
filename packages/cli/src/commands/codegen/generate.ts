// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import {Command, Flags} from '@oclif/core';
import {
  generateHandlers,
  generateManifest,
  getAbiInterface,
  getAvailableEvents,
  getAvailableFunctions,
} from '../../controller/scaffoldgen-controller';

const ACCESS_TOKEN_PATH = path.resolve(process.env.HOME, '.subql/SUBQL_ACCESS_TOKEN');
export interface SelectedMethod {
  name: string;
  method: string;
}
export interface UserInput {
  startBlock: number;
  functions: SelectedMethod[];
  events: SelectedMethod[];
  abiPath: string;
  address?: string;
}

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
    // const {manifests, root} = getProjectRootAndManifest(projectPath);

    const abiInterface = getAbiInterface(projectPath, './abis/erc20.abi.json');

    const eventsFragments = getAvailableEvents(abiInterface);
    const functionFragments = getAvailableFunctions(abiInterface);

    const eventList = Object.keys(eventsFragments);
    const functionList = Object.keys(functionFragments);

    const mockSelectedEvents = ['Transfer(address,address,uint256)'];
    const mockSelectedFunctions = ['approve(address,uint256)'];

    const constructedEvents: SelectedMethod[] = mockSelectedEvents.map((event) => {
      return {
        name: eventsFragments[event].name,
        method: event,
      };
    });

    const constructedFunctions: SelectedMethod[] = mockSelectedFunctions.map((fn) => {
      return {
        name: functionFragments[fn].name,
        method: fn,
      };
    });

    try {
      const mockUserInput: UserInput = {
        startBlock: 1,
        functions: constructedFunctions,
        events: constructedEvents,
        abiPath: './abis/erc20.abi.json',
        address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      };

      await generateManifest(projectPath, 'project.yaml', mockUserInput);

      await generateHandlers([constructedEvents, constructedFunctions], projectPath, '/abis/erc20.abi.json');
    } catch (e) {
      throw new Error(e.message);
    }
  }
}
