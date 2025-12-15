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

const removeApiKeyInputs = z.object({
  network: networkNameSchema,
  name: z.string({description: 'The name of the api key, used to identify it'}),
});
type CreateApiKeyInputs = z.infer<typeof removeApiKeyInputs>;

const removeApiKeyOutputs = z.object({});

export async function removeApiKeyAdapter(
  args: CreateApiKeyInputs,
  logger: Logger
): Promise<z.infer<typeof removeApiKeyOutputs>> {
  const signerOrProvider = await getSignerOrProvider(args.network, logger, undefined, false);
  requireSigner(signerOrProvider);

  const chs = await ConsumerHostClient.create(args.network, signerOrProvider, logger);

  const keys = await chs.getAPIKeys();

  const key = keys.find((key) => key.name === args.name);
  if (!key) {
    // Key doesn't exist so treat as a no-op
    return {};
  }

  await chs.deleteAPIKey(key.id);

  return {};
}

export default class RemoveApiKey extends Command {
  static description = 'Remove an API key used for making queries via the SubQuery Network';
  static flags = zodToFlags(removeApiKeyInputs.omit({name: true}));
  static args = zodToArgs(removeApiKeyInputs.pick({name: true}));

  async run(): Promise<void> {
    const {args, flags} = await this.parse(RemoveApiKey);
    const logger = commandLogger(this);

    await removeApiKeyAdapter({...args, ...flags}, logger);

    // Exit with success, walletconnect will keep things running
    this.exit(0);
  }
}

export function registerRemoveApiKeyMCPTool(server: McpServer): RegisteredTool {
  return server.registerTool(
    `network.${RemoveApiKey.name}`,
    {
      description: RemoveApiKey.description,
      inputSchema: removeApiKeyInputs.shape,
      outputSchema: getMCPStructuredResponse(removeApiKeyOutputs).shape,
    },
    withStructuredResponse(async (args) => {
      const logger = mcpLogger(server.server);
      return removeApiKeyAdapter(args, logger);
    })
  );
}
