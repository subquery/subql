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
  zodToFlags,
} from '../../adapters/utils';
import {networkNameSchema, getSignerOrProvider, requireSigner} from '../../controller/network/constants';
import {ConsumerHostClient} from '../../controller/network/consumer-host/client';
import {apiKeySchema} from '../../controller/network/consumer-host/schemas';
import {jsonToTable} from '../../utils';

const listApiKeysInputs = z.object({
  network: networkNameSchema,
});
type CreateApiKeyInputs = z.infer<typeof listApiKeysInputs>;

const listApiKeysOutputs = z.array(apiKeySchema);

export async function listApiKeysAdapter(
  args: CreateApiKeyInputs,
  logger: Logger
): Promise<z.infer<typeof listApiKeysOutputs>> {
  const signerOrProvider = await getSignerOrProvider(args.network, logger, undefined, false);
  requireSigner(signerOrProvider);

  const chs = await ConsumerHostClient.create(args.network, signerOrProvider, logger);

  return chs.getAPIKeys();
}

export default class ListNetworkApiKeys extends Command {
  static description = 'List API keys for making queries via the SubQuery Network';
  static flags = zodToFlags(listApiKeysInputs);

  async run(): Promise<void> {
    const {flags} = await this.parse(ListNetworkApiKeys);
    const logger = commandLogger(this);

    const result = await listApiKeysAdapter({...flags}, logger);

    if (result.length === 0) {
      this.log('No API keys found.');
    } else {
      this.log(jsonToTable(result.map((r) => ({...r, createdAt: new Date(r.createdAt)}))));
    }

    // Exit with success, walletconnect will keep things running
    this.exit(0);
  }
}

export function registerListNetworkApiKeysMCPTool(server: McpServer): RegisteredTool {
  return server.registerTool(
    `network.${ListNetworkApiKeys.name}`,
    {
      description: ListNetworkApiKeys.description,
      inputSchema: listApiKeysInputs.shape,
      outputSchema: getMCPStructuredResponse(listApiKeysOutputs).shape,
    },
    withStructuredResponse(async (args) => {
      const logger = mcpLogger(server.server);
      return listApiKeysAdapter(args, logger);
    })
  );
}
