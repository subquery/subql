// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs, {lstatSync} from 'fs';
import path from 'path';
import {EventFragment, FunctionFragment} from '@ethersproject/abi/src.ts/fragments';
import {Command, Flags} from '@oclif/core';
import {DEFAULT_MANIFEST, DEFAULT_TS_MANIFEST, extensionIsTs, getProjectRootAndManifest} from '@subql/common';
import {SubqlRuntimeDatasource as EthereumDs} from '@subql/types-ethereum';
import {parseContractPath} from 'typechain';
import {Document, Node} from 'yaml';
import {
  constructMethod,
  filterExistingMethods,
  filterObjectsByStateMutability,
  generateHandlers,
  generateManifest,
  getAbiInterface,
  getManifestData,
  prepareAbiDirectory,
  prepareInputFragments,
} from '../../controller/generate-controller';
import {extractFromTs} from '../../utils';

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
    let manifest: string;
    let root: string;
    let isTs: boolean;

    const projectPath = path.resolve(file ?? process.cwd());

    if (lstatSync(projectPath).isDirectory()) {
      if (fs.existsSync(path.join(projectPath, DEFAULT_TS_MANIFEST))) {
        manifest = path.join(projectPath, DEFAULT_TS_MANIFEST);
        isTs = true;
      } else {
        manifest = path.join(projectPath, DEFAULT_MANIFEST);
        isTs = false;
      }
      root = projectPath;
    } else if (lstatSync(projectPath).isFile()) {
      const {dir, ext} = path.parse(projectPath);
      root = dir;
      isTs = extensionIsTs(ext);
      manifest = projectPath;
    } else {
      this.error('Invalid manifest path');
    }

    const abiName = parseContractPath(abiPath).name;

    if (fs.existsSync(path.join(root, 'src/mappings/', `${abiName}Handlers.ts`))) {
      throw new Error(`file: ${abiName}Handlers.ts already exists`);
    }

    await prepareAbiDirectory(abiPath, root);
    const abiFileName = path.basename(abiPath);

    // fragments from abi
    const abiInterface = getAbiInterface(root, abiFileName);
    const eventsFragments = abiInterface.events;
    const functionFragments = filterObjectsByStateMutability(abiInterface.functions);

    let existingManifest: Document<Node<unknown>, true> | string;
    let existingDs: EthereumDs[] | string;
    // ts check if the file is ts
    if (isTs) {
      existingManifest = await fs.promises.readFile(manifest, 'utf8');

      const extractedDatasources = extractFromTs(existingManifest, {
        dataSources: undefined,
      });
      existingDs = extractedDatasources.dataSources as string;
    } else {
      // yaml
      existingManifest = await getManifestData(manifest);
      existingDs = ((existingManifest.get('dataSources') as any)?.toJSON() as EthereumDs[]) ?? [];
    }

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
        abiPath: `./abis/${abiFileName}`,
        address: address,
      };

      await generateManifest(manifest, userInput, existingManifest);
      await generateHandlers([constructedEvents, constructedFunctions], root, abiName);

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
