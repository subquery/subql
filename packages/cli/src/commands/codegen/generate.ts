// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'fs';
import path from 'path';
import {EventFragment, FunctionFragment} from '@ethersproject/abi/src.ts/fragments';
import {Command, Flags} from '@oclif/core';
import {getProjectRootAndManifest} from '@subql/common';
import {SubqlRuntimeDatasource as EthereumDs} from '@subql/types-ethereum';
import {parseContractPath} from 'typechain';
import {
  constructMethod,
  filterExistingMethods,
  filterObjectsByStateMutability,
  generateHandlers,
  generateManifest,
  getAbiInterface,
  getManifestData,
  prepareInputFragments,
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
    const abiName = parseContractPath(abiPath).name;

    if (fs.existsSync(path.join(root, 'src/mappings/', `${abiName}Handlers.ts`))) {
      throw new Error(`file: ${abiName}Handlers.ts already exists`);
    }

    // fragments from abi
    const abiInterface = getAbiInterface(root, abiPath);
    const eventsFragments = abiInterface.events;
    const functionFragments = filterObjectsByStateMutability(abiInterface.functions);

    // if the handler file already exists, should throw

    const existingManifest = await getManifestData(root, manifests[0]);
    const existingDs = (existingManifest.get('dataSources') as any).toJSON() as EthereumDs[];

    const selectedEvents = await prepareInputFragments('event', events, eventsFragments, abiName);
    const selectedFunctions = await prepareInputFragments('function', functions, functionFragments, abiName);

    const [cleanEvents, cleanFunctions] = filterExistingMethods(selectedEvents, selectedFunctions, existingDs, address);

    const constructedEvents: SelectedMethod[] = constructMethod<EventFragment>(cleanEvents);
    const constructedFunctions: SelectedMethod[] = constructMethod<FunctionFragment>(cleanFunctions);

    try {
      const userInput: UserInput = {
        startBlock: startBlock,
        functions: constructedFunctions,
        events: constructedEvents,
        abiPath: abiPath,
        address: address,
      };

      await generateManifest(root, manifests[0], userInput, existingManifest);
      await generateHandlers([constructedEvents, constructedFunctions], root, abiPath);

      this.log('-----------Generated-----------');
      Object.keys(cleanFunctions).map((fn) => {
        this.log(`Function: ${fn} successfully generated`);
      });
      Object.keys(cleanEvents).map((event) => {
        this.log(`Event: ${event} successfully generated`);
      });
      this.log('-------------------------------');
    } catch (e) {
      throw new Error(e.message);
    }
  }
}
