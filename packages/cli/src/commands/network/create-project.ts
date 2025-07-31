// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {McpServer, RegisteredTool} from '@modelcontextprotocol/sdk/server/mcp';
import {Command} from '@oclif/core';
import {IPFS_WRITE_ENDPOINT, IPFSHTTPClientLite} from '@subql/common';
import {ProjectType} from '@subql/contract-sdk';
import {ProjectCreatedEvent} from '@subql/contract-sdk/typechain/contracts/ProjectRegistry';
import {z} from 'zod';
import {
  commandLogger,
  getMCPStructuredResponse,
  Logger,
  makeCLIPrompt,
  makeMCPElicitPrmompt,
  mcpLogger,
  MCPToolOptions,
  Prompt,
  withStructuredResponse,
  zodToFlags,
} from '../../adapters/utils';
import {
  checkTransactionSuccess,
  deploymentMetadataSchema,
  getContractSDK,
  getSignerOrProvider,
  networkNameSchema,
  projectMetadataSchema,
  projectTypeSchema,
  requireSigner,
} from '../../controller/network/constants';

const createProjectInputs = z.object({
  network: networkNameSchema,
  deploymentId: z.string({description: 'The IPFS CID of the published project'}),
  projectType: projectTypeSchema,
  // projectMetadata: projectMetadataSchema,
  // deploymentMetadata: deploymentMetadataSchema,

  // Project meta
  name: z.string({description: 'The name of the project'}),
  description: z.string({description: 'A short description of the project'}).optional(),
  image: z.string({description: 'A URL to an image for the project'}).optional(),
  tags: z.array(z.string(), {description: 'A list of tags for the project'}).optional(),
  website: z.string({description: 'A URL to the project website'}).optional(),
  codeRepository: z.string({description: 'A URL to the project code repository'}).optional(),

  // Deployment meta
  deploymentVersion: z.string({description: 'The version of the deployment'}).optional().default('1.0.0'),
  deploymentDescription: z.string({description: 'A description of the deployment, release notes'}).optional(),
});
type CreateProjectInputs = z.infer<typeof createProjectInputs>;

const createProjectOutputs = z.object({
  transactionHash: z.string({description: 'The hash of the transaction that created the project'}),
  projectId: z.string({description: 'The ID of the created project'}),
  projectUrl: z.string({description: 'The URL of the created project in the SubQuery app'}),
});

async function createProjectAdapter(
  args: CreateProjectInputs,
  logger: Logger,
  prompt?: Prompt
): Promise<z.infer<typeof createProjectOutputs>> {
  const signerOrProvider = await getSignerOrProvider(args.network, logger, undefined, true);
  const sdk = getContractSDK(signerOrProvider, args.network);
  requireSigner(signerOrProvider);

  const projectType = ProjectType[args.projectType];

  if (!args.description) {
    if (prompt) {
      args.description = await prompt({
        type: 'string',
        message: 'Enter a short description of the project',
      });
    } else {
      throw new Error('Project description is required');
    }
  }

  if (!args.deploymentVersion) {
    if (prompt) {
      args.deploymentVersion = await prompt({
        type: 'string',
        defaultValue: '1.0.0',
        message: 'Enter a deployment version',
      });
    }
  }

  if (!args.deploymentDescription) {
    if (prompt) {
      args.deploymentDescription = await prompt({
        type: 'string',
        message: 'Enter a deployment description',
      });
    }
  }

  const projectMetadata = projectMetadataSchema.parse({
    name: args.name,
    description: args.description,
    image: args.image,
    tags: args.tags,
    website: args.website,
    codeRepository: args.codeRepository,
  });

  const deploymentVersion =
    args.deploymentVersion ??
    (await prompt?.({
      message: 'Enter the deployment version',
      defaultValue: '1.0.0',
      type: 'string',
    }));

  if (!deploymentVersion) {
    throw new Error('Deployment version is required');
  }

  const deploymentMetadata = deploymentMetadataSchema.parse({
    version: args.deploymentVersion,
    description: args.deploymentDescription,
  });

  // TODO provide auth token
  let authToken: string | undefined;
  const ipfs = new IPFSHTTPClientLite({
    url: IPFS_WRITE_ENDPOINT,
    headers: authToken ? {Authorization: `Bearer ${authToken}`} : undefined,
  });

  const [{cid: projectMetadataCID}, {cid: deploymentMetadataCID}] = await Promise.all([
    ipfs.add(JSON.stringify(projectMetadata), {pin: true}),
    ipfs.add(JSON.stringify(deploymentMetadata), {pin: true}),
  ]);

  const tx = await sdk.projectRegistry.createProject(
    projectMetadataCID,
    deploymentMetadataCID,
    args.deploymentId,
    projectType
  );

  logger.info(`Create project transaction: ${tx.hash}`);

  const receipt = await checkTransactionSuccess(tx);

  let projectId: string | undefined;
  receipt.events?.forEach((event) => {
    try {
      const parsedEvent = sdk.projectRegistry.interface.parseLog(event);

      const createEvent =
        sdk.projectRegistry.interface.events['ProjectCreated(address,uint256,string,uint8,bytes32,bytes32)'];

      if (parsedEvent.name === createEvent.name) {
        // Not a full correct type cast but it gets us typed args.
        projectId = (parsedEvent as unknown as ProjectCreatedEvent).args.projectId.toHexString(); // Index 1
      }
    } catch (error) {
      // Do nothing, event might come from another contract or be unrelated
    }
  });

  if (!projectId) {
    throw new Error(`Unable to determine projectId from transaction events`);
  }

  return {
    transactionHash: tx.hash,
    projectId,
    projectUrl: `https://app.subquery.network/explorer/project/${projectId}/overview`,
  };
}

export default class CreateNetworkProject extends Command {
  static description = 'Create a new SubQuery project on the SubQuery network';
  static flags = zodToFlags(createProjectInputs);

  async run(): Promise<void> {
    const {flags} = await this.parse(CreateNetworkProject);

    await createProjectAdapter(flags, commandLogger(this), makeCLIPrompt());
    this.log('Project created successfully!');

    // Exit with success, walletconnect will keep things running
    this.exit(0);
  }
}

export function registerCreateNetworkProjectMCPTool(server: McpServer, opts: MCPToolOptions): RegisteredTool {
  return server.registerTool(
    CreateNetworkProject.name,
    {
      description: CreateNetworkProject.description,
      inputSchema: (opts.supportsElicitation ? createProjectInputs : createProjectInputs.required({description: true}))
        .shape,
      outputSchema: getMCPStructuredResponse(createProjectOutputs).shape,
    },
    withStructuredResponse(async (args) => {
      const logger = mcpLogger(server.server);
      const prompt = opts.supportsElicitation ? makeMCPElicitPrmompt(server) : undefined;
      return createProjectAdapter(args, logger, prompt);
    })
  );
}
