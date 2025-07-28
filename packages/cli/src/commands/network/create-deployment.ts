// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {McpServer, RegisteredTool} from '@modelcontextprotocol/sdk/server/mcp';
import {Command} from '@oclif/core';
import {IPFS_WRITE_ENDPOINT, IPFSHTTPClientLite} from '@subql/common';
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
import {networkNameSchema, getContractSDK, deploymentMetadataSchema} from '../../controller/network/constants';

const createDeploymentInputs = z.object({
  network: networkNameSchema,
  projectId: z.string({description: 'The project id, this should be a 0x prefixed hex number'}),

  deploymentId: z.string({description: 'The IPFS CID of the published project'}),
  deploymentVersion: z.string({description: 'The version of the deployment'}),
  deploymentDescription: z.string({description: 'A description of the deployment, release notes'}).optional(),
});
type CreateDeploymentInputs = z.infer<typeof createDeploymentInputs>;

const createDeploymentOutputs = z.object({
  transactionHash: z.string({description: 'The hash of the transaction that created the project'}),
  deploymentId: z.string({description: 'The ID of the created deployment'}),
  deploymentUrl: z.string({description: 'The URL of the created deployment in the SubQuery app'}),
});

export async function createDeploymentAdapter(
  args: CreateDeploymentInputs,
  logger: Logger,
  prompt?: Prompt
): Promise<z.infer<typeof createDeploymentOutputs>> {
  const sdk = getContractSDK(args.network);

  if (!args.deploymentDescription) {
    if (prompt) {
      args.deploymentDescription = await prompt({
        type: 'string',
        message: 'Enter a deployment description',
      });
    }
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

  const {cid} = await ipfs.add(JSON.stringify(deploymentMetadata), {pin: true});

  const tx = await sdk.projectRegistry.addOrUpdateDeployment(args.projectId, args.deploymentId, cid, true);

  // TODO handle tx failure
  await tx.wait();

  const deploymentUrl = `https://app.subquery.network/explorer/project/${args.projectId}/overview?deploymentId=${args.deploymentId}`;

  return {
    transactionHash: tx.hash,
    deploymentId: args.deploymentId,
    deploymentUrl,
  };
}

export default class CreateNetworkDeployment extends Command {
  static description = 'Create a new deployment for a SubQuery project on the specified network';
  static flags = zodToFlags(createDeploymentInputs);

  async run(): Promise<void> {
    const {args, flags} = await this.parse(CreateNetworkDeployment);
    const logger = commandLogger(this);

    const result = await createDeploymentAdapter({...args, ...flags}, logger, makeCLIPrompt());
    logger.info(`Deployment created successfully! Transaction hash: ${result.transactionHash}`);
    logger.info(`Deployment URL: ${result.deploymentUrl}`);
  }
}

export function registerCreateNetworkDeploymentMCPTool(server: McpServer, opts: MCPToolOptions): RegisteredTool {
  return server.registerTool(
    CreateNetworkDeployment.name,
    {
      description: CreateNetworkDeployment.description,
      inputSchema: (opts.supportsElicitation
        ? createDeploymentInputs
        : createDeploymentInputs.required({deploymentDescription: true})
      ).shape,
      outputSchema: getMCPStructuredResponse(createDeploymentOutputs).shape,
    },
    withStructuredResponse(async (args) => {
      const logger = mcpLogger(server.server);
      const prompt = opts.supportsElicitation ? makeMCPElicitPrmompt(server) : undefined;
      return createDeploymentAdapter(args, logger, prompt);
    })
  );
}
