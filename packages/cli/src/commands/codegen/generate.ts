// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'fs';
import path from 'path';
import type {EventFragment, FunctionFragment} from '@ethersproject/abi';
import {Command, Flags} from '@oclif/core';
import {
  NETWORK_FAMILY,
  getProjectRootAndManifest,
  getProjectNetwork,
  getManifestPath,
  loadFromJsonOrYaml,
} from '@subql/common';
import type {ProjectManifestV1_0_0} from '@subql/types-core';
import type {SubqlRuntimeDatasource as EthereumDs} from '@subql/types-ethereum';
import ora from 'ora';
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
  saveAbiToFile,
} from '../../controller/generate-controller';
import {loadDependency} from '../../modulars';
import {extractFromTs, buildManifestFromLocation, getTsManifest} from '../../utils';
import {fetchContractDeployHeight, tryFetchAbiFromExplorer} from '../../utils/etherscan';

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
  static description =
    'Generate project handlers and mapping functions based on an Ethreum ABI. If address is provided, it will attempt to fetch the ABI and start block from the Etherscan.';

  static flags = {
    file: Flags.string({char: 'f', description: 'Project folder or manifest file'}),
    address: Flags.string({description: 'The contracts address'}),
    startBlock: Flags.integer({
      description: 'The start block of the handler, generally the block the contract is deployed.',
    }),
    abiPath: Flags.string({description: 'The path to the ABI file'}),
    events: Flags.string({description: 'ABI events to generate handlers for, --events="approval, transfer"'}),
    functions: Flags.string({description: 'ABI functions to generate handlers for,  --functions="approval, transfer"'}),
  };

  // This command needs a better name, having the alias also puts this in the top level help
  static aliases = ['import-abi'];

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
    const {address, events, file, functions} = flags;
    let {abiPath, startBlock} = flags;
    // let manifest: string, root: string;
    let isTs = false;

    const projectPath = path.resolve(file ?? process.cwd());

    /*
      ts manifest can be either single chain ts manifest
      or multichain ts manifest
      or multichain yaml manifest containing single chain ts project paths
    */
    const tsManifest = getTsManifest(projectPath);

    // Ensure the manifest is built so we can extract data
    if (tsManifest) {
      isTs = true;
      await buildManifestFromLocation(tsManifest, this.log.bind(this));
    }

    const {manifests, root} = getProjectRootAndManifest(projectPath);
    if (manifests.length > 1) {
      //
      throw new Error('For multichain projects a specific manifest must be provided');
    }
    // TODO ensure we still use TS path
    // TODO ensure if it is multichain and speific manifest is provided we use that
    const yamlManifest = getManifestPath(root, manifests[0]);
    const manifest = tsManifest ?? yamlManifest;

    const project = loadFromJsonOrYaml(yamlManifest) as ProjectManifestV1_0_0;

    if (getProjectNetwork(project) !== NETWORK_FAMILY.ethereum) {
      throw new Error('ABI generation is only supported for Ethereum projects');
    }

    if (!abiPath) {
      if (!address) {
        this.error('Please provide the ABI file path using --abiPath flag, or address to fetch the ABI from Ethersacn');
      }
      const spinner = ora('Finding ABI from Etherscan').start();
      try {
        const abi = await tryFetchAbiFromExplorer(address, project.network.chainId);
        if (!abi) {
          spinner.stop();
          this.error(`Unable to fetch ABI from Etherscan, please provide the ABI file path using --abiPath flag`);
        }

        abiPath = await saveAbiToFile(abi, address, root);
        spinner.succeed('Found ABI from Etherscan');
      } catch (e) {
        spinner.stop();
        throw e;
      }
    }

    if (!startBlock) {
      if (!address) {
        // Cannot fetch start block without address
        this.error('Please provide the start block using the --startBlock flag');
      }
      const spinner = ora('Finding start height from explorer').start();
      try {
        startBlock = await fetchContractDeployHeight(address, project.network.chainId);
        if (!startBlock) {
          throw new Error(`Unable to find start block for contract ${address}`);
        }
        spinner.succeed(`Found contract deployed at height ${startBlock}, using as start block.`);
      } catch (e) {
        spinner.stop();
        this.error(
          `Unable to fetch start block from block explorer, please provide the start block using --startBlock flag`
        );
      }
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
