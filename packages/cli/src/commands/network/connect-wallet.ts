// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {McpServer, RegisteredTool} from '@modelcontextprotocol/sdk/server/mcp';
import {Command} from '@oclif/core';
import {SQNetworks} from '@subql/network-config';
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
import {getSignerOrProvider, requireSigner} from '../../controller/network/constants';

const connectWalletInputs = z.object({});
type ConnectWalletInputs = z.infer<typeof connectWalletInputs>;

const connnectWalletOutputs = z.object({
  address: z.string({description: 'The address of the connected wallet'}),
});

export async function connectWalletAdapter(
  args: ConnectWalletInputs,
  logger: Logger,
  prompt?: Prompt
): Promise<z.infer<typeof connnectWalletOutputs>> {
  const signer = await getSignerOrProvider(SQNetworks.MAINNET, logger, undefined, true);
  requireSigner(signer);

  return {
    address: await signer.getAddress(),
  };
}

export default class ConnectWallet extends Command {
  static description = 'Connect a wallet via Wallet Connect for interacting with the network';
  static flags = zodToFlags(connectWalletInputs);

  async run(): Promise<void> {
    const {flags} = await this.parse(ConnectWallet);

    const {address} = await connectWalletAdapter(flags, commandLogger(this), makeCLIPrompt());

    this.log(`Connected to account: ${address}. You can now use any commands that interact with the network`);

    // Exit with success, walletconnect will keep things running
    this.exit(0);
  }
}

export function registerConnectWalletMCPTool(server: McpServer, opts: MCPToolOptions): RegisteredTool {
  return server.registerTool(
    ConnectWallet.name,
    {
      description: ConnectWallet.description,
      inputSchema: connectWalletInputs.shape,
      outputSchema: getMCPStructuredResponse(connnectWalletOutputs).shape,
    },
    withStructuredResponse(async (args) => {
      const logger = mcpLogger(server.server);
      const prompt = opts.supportsElicitation ? makeMCPElicitPrmompt(server) : undefined;

      return connectWalletAdapter(args, logger, prompt);
    })
  );
}
