// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'fs';
import path from 'path';
import {McpServer, RegisteredTool} from '@modelcontextprotocol/sdk/server/mcp';
import {Command} from '@oclif/core';
import {
  NETWORK_FAMILY,
  getProjectRootAndManifest,
  getProjectNetwork,
  getManifestPath,
  loadFromJsonOrYaml,
} from '@subql/common';
import type {ProjectManifestV1_0_0} from '@subql/types-core';
import type {SubqlRuntimeDatasource as EthereumDs} from '@subql/types-ethereum';
import {z} from 'zod';
import {
  commandLogger,
  getMCPStructuredResponse,
  getMCPWorkingDirectory,
  Logger,
  makeCLIPrompt,
  makeMCPElicitPrmompt,
  mcpLogger,
  MCPToolOptions,
  Prompt,
  withStructuredResponse,
  zodToArgs,
  zodToFlags,
} from '../../adapters/utils';
import {
  filterObjectsByStateMutability,
  generateHandlers,
  generateManifestTs,
  generateManifestYaml,
  getManifestData,
  prepareAbiDirectory,
  prepareInputFragments,
  tsExtractor,
  yamlExtractor,
  saveAbiToFile,
  prepareUserInput,
  UserInput,
} from '../../controller/generate-controller';
import {loadDependency} from '../../modulars';
import {extractFromTs, buildManifestFromLocation, getTsManifest} from '../../utils';
import {fetchContractDeployHeight, tryFetchAbiFromExplorer} from '../../utils/etherscan';

const generateInputs = z.object({
  location: z.string({description: 'The path to the project, this can be a directory or a project manifest file.'}),
  address: z.string({description: 'The contracts address'}).optional(),
  abiName: z
    .string({
      description:
        'The contracts name, if not provided, the contract address will be used if the ABI is fetched from Etherscan',
    })
    .optional(),
  startBlock: z
    .number({
      description: 'The start block of the handler, generally the block the contract is deployed.',
    })
    .optional(),
  abiPath: z.string({description: 'The path to the ABI file'}).optional(),
  events: z
    .string({description: `ABI events to generate handlers for. Use '*' for all. e.g. --events="approval, transfer"`})
    .optional(),
  functions: z
    .string({
      description: `ABI functions to generate handlers for. Use '*' for all. e.g. --functions="approval, transfer"`,
    })
    .optional(),
});
type GenerateInputs = z.infer<typeof generateInputs>;

const generateOutputs = z.object({
  address: z.string({description: 'The address of the contract'}).optional(),
  startBlock: z.number({description: 'The start block of the handler'}).optional(),
  events: z.array(z.string({description: 'Handlers for events generated during the generation process'})),
  functions: z.array(z.string({description: 'Handlers for functions generated during the generation process'})),
});

// eslint-disable-next-line complexity
async function generateAdapter(
  workingDir: string,
  args: GenerateInputs,
  logger: Logger,
  prompt: Prompt | null
): Promise<z.infer<typeof generateOutputs>> {
  const location = path.resolve(workingDir, args.location);
  let isTs = false;

  /*
    ts manifest can be either single chain ts manifest
    or multichain ts manifest
    or multichain yaml manifest containing single chain ts project paths
  */
  const tsManifest = getTsManifest(location);

  // Ensure the manifest is built so we can extract data
  if (tsManifest) {
    isTs = true;
    await buildManifestFromLocation(tsManifest, logger.info.bind(logger));
  }

  const {manifests, root} = getProjectRootAndManifest(location);
  if (manifests.length > 1) {
    //
    throw new Error('For multichain projects a specific manifest must be provided');
  }
  const yamlManifest = getManifestPath(root, manifests[0]);
  const manifest = tsManifest ?? yamlManifest;

  const project = loadFromJsonOrYaml(yamlManifest) as ProjectManifestV1_0_0;

  if (getProjectNetwork(project) !== NETWORK_FAMILY.ethereum) {
    throw new Error('ABI generation is only supported for Ethereum projects');
  }

  if (!prompt && !args.events && !args.functions) {
    throw new Error('Please provide either events and/or functions from the ABI that you wish to import.');
  }

  if (!args.abiPath) {
    if (!args.address) {
      throw new Error('Please provide the Address the attempt to fetch from Etherscan or an ABI file path');
    }
    // const spinner = ora({text: 'Finding ABI from Etherscan', isSilent: flags.mcp}).start();
    logger.info('Finding ABI on Etherscan');
    try {
      const abi = await tryFetchAbiFromExplorer(args.address, project.network.chainId);
      if (!abi) {
        // spinner.stop();
        throw new Error('Unable to fetch ABI from Etherscan, please provide an ABI via the abiPath');
      }

      args.abiPath = await saveAbiToFile(abi, args.abiName ?? args.address, root);
      logger.info('Found ABI from Etherscan');
    } catch (e) {
      // spinner.stop();
      throw new Error('Failed to fetch ABI from Etherscan', {cause: e});
    }
  }

  if (!args.startBlock) {
    if (!args.address) {
      // Cannot fetch start block without address
      throw new Error('Please provide the start block');
    }
    logger.info('Finding start height from Etherscan');
    try {
      args.startBlock = await fetchContractDeployHeight(args.address, project.network.chainId);
      if (!args.startBlock) {
        throw new Error(`Unable to find start block for contract ${args.address}`);
      }
      logger.info(`Found contract deployed at height ${args.startBlock}, using as start block.`);
    } catch (e) {
      throw new Error(`Unable to fetch start block from Etherscan, please provide the start block`, {cause: e});
    }
  }

  const ethModule = loadDependency(NETWORK_FAMILY.ethereum, args.location);
  const abiName = ethModule.parseContractPath(args.abiPath).name;

  if (fs.existsSync(path.join(root, 'src/mappings/', `${abiName}Handlers.ts`))) {
    throw new Error(`file: ${abiName}Handlers.ts already exists`);
  }

  await prepareAbiDirectory(args.abiPath, root);
  const abiFileName = path.basename(args.abiPath);

  // fragments from abi
  const abiInterface = ethModule.getAbiInterface(root, abiFileName);
  const eventsFragments = abiInterface.events;
  const functionFragments = filterObjectsByStateMutability(abiInterface.functions);

  const selectedEvents = await prepareInputFragments('event', args.events, eventsFragments, abiName, prompt);
  const selectedFunctions = await prepareInputFragments('function', args.functions, functionFragments, abiName, prompt);

  if (!Object.keys(selectedEvents).length && !Object.keys(selectedFunctions).length) {
    throw new Error(`When importing an ABI, please select at least one event or function`);
  }

  let userInput: UserInput;

  if (isTs) {
    const existingManifest = await fs.promises.readFile(manifest, 'utf8');
    const extractedDatasources = extractFromTs(existingManifest, {
      dataSources: undefined,
    });
    const existingDs = extractedDatasources.dataSources as string;

    userInput = prepareUserInput(
      selectedEvents,
      selectedFunctions,
      existingDs,
      args.address,
      args.startBlock,
      abiFileName,
      tsExtractor
    );

    await generateManifestTs(manifest, userInput, existingManifest);
  } else {
    // yaml
    const existingManifest = await getManifestData(manifest);
    const existingDs = ((existingManifest.get('dataSources') as any)?.toJSON() as EthereumDs[]) ?? [];

    userInput = prepareUserInput(
      selectedEvents,
      selectedFunctions,
      existingDs,
      args.address,
      args.startBlock,
      abiFileName,
      yamlExtractor
    );

    await generateManifestYaml(manifest, userInput, existingManifest);
  }

  await generateHandlers([userInput.events, userInput.functions], root, abiName);

  return {
    address: args.address,
    startBlock: args.startBlock,
    events: userInput.events.map((event) => event.name),
    functions: userInput.functions.map((fn) => fn.name),
  };
}

export default class ImportAbi extends Command {
  static description =
    'Import and ABI to generate project handlers and mapping functions based on an Ethereum ABI. If address is provided, it will attempt to fetch the ABI and start block from the Etherscan.';

  static flags = zodToFlags(generateInputs.omit({location: true}));
  static args = zodToArgs(generateInputs.pick({location: true}));

  static aliases = ['import-abi'];

  async run(): Promise<void> {
    const {args, flags} = await this.parse(ImportAbi);

    const logger = commandLogger(this);

    const result = await generateAdapter(process.cwd(), {...flags, ...args}, logger, makeCLIPrompt());

    this.log('-----------Generated-----------');
    if (result.address) {
      this.log(`Address: ${result.address}`);
    }
    if (result.startBlock) {
      this.log(`Start Block: ${result.startBlock}`);
    }
    result.functions.forEach((fn) => {
      this.log(`Function: ${fn} successfully generated`);
    });
    result.events.forEach((event) => {
      this.log(`Event: ${event} successfully generated`);
    });
    this.log('-------------------------------');
  }
}

const nonInteractiveGenerateInputs = generateInputs;

export function registerImportAbiMCPTool(server: McpServer, opts: MCPToolOptions): RegisteredTool {
  return server.registerTool(
    ImportAbi.name,
    {
      description: ImportAbi.description,
      inputSchema: (opts.supportsElicitation ? generateInputs : nonInteractiveGenerateInputs).shape,
      outputSchema: getMCPStructuredResponse(generateOutputs).shape,
    },
    withStructuredResponse(async (args) => {
      const logger = mcpLogger(server.server);
      const cwd = await getMCPWorkingDirectory(server);
      const prompt = opts.supportsElicitation ? makeMCPElicitPrmompt(server) : null;
      return generateAdapter(cwd, args, logger, prompt);
    })
  );
}
