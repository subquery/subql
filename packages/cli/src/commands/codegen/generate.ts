// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs, {lstatSync} from 'fs';
import path from 'path';
import type {EventFragment, FunctionFragment} from '@ethersproject/abi';
import {Command, Flags} from '@oclif/core';
import {DEFAULT_MANIFEST, DEFAULT_TS_MANIFEST, extensionIsTs, NETWORK_FAMILY} from '@subql/common';
import type {SubqlRuntimeDatasource as EthereumDs} from '@subql/types-ethereum';
import {
  constructMethod,
  filterExistingMethods,
  filterObjectsByStateMutability,
  generateHandlers,
  generateManifestTs,
  generateManifestYaml,
  getManifestData,
  ManifestExtractor,
  prepareAbiDirectory,
  prepareInputFragments,
  tsExtractor,
  yamlExtractor,
} from '../../controller/generate-controller';
import {loadDependency} from '../../modulars';
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

  private prepareUserInput<T>(
    selectedEvents: Record<string, EventFragment>,
    selectedFunctions: Record<string, FunctionFragment>,
    existingDs: T,
    address: string | undefined,
    startBlock: number,
    abiFileName: string,
    extractor: ManifestExtractor<T>
  ): UserInput {
    const [cleanEvents, cleanFunctions] = filterExistingMethods(
      selectedEvents,
      selectedFunctions,
      existingDs,
      address,
      extractor
    );

    const constructedEvents = constructMethod<EventFragment>(cleanEvents);
    const constructedFunctions = constructMethod<FunctionFragment>(cleanFunctions);

    return {
      startBlock: startBlock,
      functions: constructedFunctions,
      events: constructedEvents,
      abiPath: `./abis/${abiFileName}`,
      address: address,
    };
  }
  async run(): Promise<void> {
    const {flags} = await this.parse(Generate);
    const {abiPath, address, events, file, functions, startBlock} = flags;
    let manifest: string, root: string;
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

    const ethModule = loadDependency(NETWORK_FAMILY.ethereum);
    const abiName = ethModule.parseContractPath(abiPath).name;

    if (fs.existsSync(path.join(root, 'src/mappings/', `${abiName}Handlers.ts`))) {
      throw new Error(`file: ${abiName}Handlers.ts already exists`);
    }

    await prepareAbiDirectory(abiPath, root);
    const abiFileName = path.basename(abiPath);

    // fragments from abi
    const abiInterface = ethModule.getAbiInterface(root, abiFileName);
    const eventsFragments = abiInterface.events;
    const functionFragments = filterObjectsByStateMutability(abiInterface.functions);

    const selectedEvents = await prepareInputFragments('event', events, eventsFragments, abiName);
    const selectedFunctions = await prepareInputFragments('function', functions, functionFragments, abiName);

    let userInput: UserInput;

    try {
      if (isTs) {
        const existingManifest = await fs.promises.readFile(manifest, 'utf8');
        const extractedDatasources = extractFromTs(existingManifest, {
          dataSources: undefined,
        });
        const existingDs = extractedDatasources.dataSources as string;

        userInput = this.prepareUserInput(
          selectedEvents,
          selectedFunctions,
          existingDs,
          address,
          startBlock,
          abiFileName,
          tsExtractor
        );

        await generateManifestTs(manifest, userInput, existingManifest);
      } else {
        // yaml
        const existingManifest = await getManifestData(manifest);
        const existingDs = ((existingManifest.get('dataSources') as any)?.toJSON() as EthereumDs[]) ?? [];

        userInput = this.prepareUserInput(
          selectedEvents,
          selectedFunctions,
          existingDs,
          address,
          startBlock,
          abiFileName,
          yamlExtractor
        );

        await generateManifestYaml(manifest, userInput, existingManifest);
      }

      await generateHandlers([userInput.events, userInput.functions], root, abiName);

      this.log('-----------Generated-----------');
      userInput.functions.forEach((fn) => {
        this.log(`Function: ${fn.name} successfully generated`);
      });
      userInput.events.forEach((event) => {
        this.log(`Event: ${event.name} successfully generated`);
      });
      this.log('-------------------------------');
    } catch (e: any) {
      this.error(e);
    }
  }
}
