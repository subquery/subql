// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {McpServer, RegisteredTool} from '@modelcontextprotocol/sdk/server/mcp';
import {Command} from '@oclif/core';
import {z} from 'zod';
import {
  commandLogger,
  getMCPStructuredResponse,
  Logger,
  mcpLogger,
  withStructuredResponse,
  zodToArgs,
  zodToFlags,
} from '../../adapters/utils';
import {networkNameSchema, getSignerOrProvider, requireSigner} from '../../controller/network/constants';
import {ConsumerHostClient} from '../../controller/network/consumer-host/client';
import {apiKeySchema} from '../../controller/network/consumer-host/schemas';

const createApiKeyInputs = z.object({
  network: networkNameSchema,
  name: z.string({description: 'The name of the api key, used to identify it'}),
});
type CreateApiKeyInputs = z.infer<typeof createApiKeyInputs>;

const createApiKeyOutputs = apiKeySchema;

export async function createApiKeyAdapter(
  args: CreateApiKeyInputs,
  logger: Logger
): Promise<z.infer<typeof createApiKeyOutputs>> {
  const signerOrProvider = await getSignerOrProvider(args.network, logger, undefined, false);
  requireSigner(signerOrProvider);

  const chs = await ConsumerHostClient.create(args.network, signerOrProvider, logger);

  const apiKey = await chs.newAPIKey(args.name);

  return apiKey;
}

export default class CreateNetworkApiKey extends Command {
  static description = 'Create an API key for making queries via the SubQuery Network';
  static flags = zodToFlags(createApiKeyInputs.omit({name: true}));
  static args = zodToArgs(createApiKeyInputs.pick({name: true}));

  async run(): Promise<void> {
    const {args, flags} = await this.parse(CreateNetworkApiKey);
    const logger = commandLogger(this);

    const result = await createApiKeyAdapter({...args, ...flags}, logger);

    this.log(`API Key: ${result.apiKey}`);

    // Exit with success, walletconnect will keep things running
    this.exit(0);
  }
}

export function registerCreateNetworkApiKeyMCPTool(server: McpServer): RegisteredTool {
  return server.registerTool(
    `network.${CreateNetworkApiKey.name}`,
    {
      description: CreateNetworkApiKey.description,
      inputSchema: createApiKeyInputs.shape,
      outputSchema: getMCPStructuredResponse(createApiKeyOutputs).shape,
    },
    withStructuredResponse(async (args) => {
      const logger = mcpLogger(server.server);
      return createApiKeyAdapter(args, logger);
    })
  );
}
