// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import {Command, Flags} from '@oclif/core';
import {getProjectRootAndManifest} from '@subql/common';
import * as inquirer from 'inquirer';
import {
  generateHandlers,
  generateManifest,
  getAbiInterface,
  getAvailableEvents,
  getAvailableFunctions,
} from '../../controller/scaffoldgen-controller';

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
    events: Flags.string({description: 'abi events', required: true}),
    functions: Flags.string({description: 'abi functions', required: true}),
    abiPath: Flags.string({description: 'path to abi from root', required: true}),
    startBlock: Flags.integer({description: 'startBlock', required: true}),
    address: Flags.string({description: 'contract address'}),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Generate);
    const {abiPath, address, events, file, functions, location, startBlock} = flags;
    const projectPath = path.resolve(file ?? location ?? process.cwd());
    const {manifests, root} = getProjectRootAndManifest(projectPath);

    const abiInterface = getAbiInterface(projectPath, abiPath);

    const eventsFragments = getAvailableEvents(abiInterface);
    const functionFragments = getAvailableFunctions(abiInterface);

    const availableEventList = Object.keys(eventsFragments);
    const availableFunctionList = Object.keys(functionFragments);

    const eventArray: string[] = [];
    const functionArray: string[] = [];

    if (events !== '*') {
      try {
        const chosenEvent = await inquirer.prompt({
          name: 'events',
          message: 'Select events',
          type: 'checkbox',
          choices: availableEventList,
        });
        eventArray.push(...chosenEvent.events);
      } catch (e) {
        throw new Error(e);
      }
    } else {
      eventArray.push(...availableEventList);
    }

    if (functions !== '*') {
      try {
        const chosenFn = await inquirer.prompt({
          name: 'functions',
          message: 'Select Functions',
          type: 'checkbox',
          choices: availableFunctionList,
        });
        functionArray.push(...chosenFn.functions);
      } catch (e) {
        throw new Error(e);
      }
    } else {
      functionArray.push(...availableFunctionList);
    }

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
