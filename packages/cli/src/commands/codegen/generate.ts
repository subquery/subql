// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import path from 'path';
import {Command, Flags} from '@oclif/core';
import {getProjectRootAndManifest} from '@subql/common';
import {parseContractPath} from 'typechain';
import {
  filterObjectsByStateMutability,
  generateHandlers,
  generateManifest,
  getAbiInterface,
  promptSelectables,
} from '../../controller/generate-controller';

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
  static description = 'Generate Project.yaml and mapping functions based on provided ABI';

  static flags = {
    file: Flags.string({char: 'f', description: 'specify manifest file path'}),
    events: Flags.string({description: 'abi events, --events="approval, transfer"'}),
    functions: Flags.string({description: 'abi functions,  --functions="approval, transfer"'}),
    abiPath: Flags.string({description: 'path to abi from root', required: true}),
    startBlock: Flags.integer({description: 'startBlock', required: true}),
    address: Flags.string({description: 'contract address'}),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Generate);
    const {abiPath, address, events, file, functions, startBlock} = flags;

    const projectPath = path.resolve(file ?? process.cwd());
    const {manifests, root} = getProjectRootAndManifest(projectPath);

    const abiInterface = getAbiInterface(root, abiPath);

    const eventsFragments = abiInterface.events;
    const functionFragments = filterObjectsByStateMutability(abiInterface.functions);

    // const availableEventList = Object.keys(eventsFragments);
    // const availableFunctionList = Object.keys(functionFragments);

    const eventArray: string[] = [];
    const functionArray: string[] = [];

    const abiName = parseContractPath(abiPath).name;
    eventArray.push(...(await promptSelectables('event', eventsFragments, events, abiName)));
    functionArray.push(...(await promptSelectables('function', functionFragments, functions, abiName)));

    const constructedEvents = eventArray.map((event) => {
      return {
        name: eventsFragments[event].name,
        method: event,
      };
    });

    const constructedFunctions: SelectedMethod[] = functionArray.map((fn) => {
      return {
        name: functionFragments[fn].name,
        method: fn,
      };
    });

    try {
      const userInput: UserInput = {
        startBlock: startBlock,
        functions: constructedFunctions,
        events: constructedEvents,
        abiPath: abiPath,
        address: address,
      };
      await generateManifest(root, manifests[0], userInput);
      await generateHandlers([constructedEvents, constructedFunctions], root, abiPath);

      this.log('-----------Generated-----------');
      functionArray.map((fn) => {
        this.log(`Function: ${fn} successfully generated`);
      });
      eventArray.map((event) => {
        this.log(`Event: ${event} successfully generated`);
      });
      this.log('-------------------------------');
    } catch (e) {
      throw new Error(e.message);
    }
  }
}
