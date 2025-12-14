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
  mcpLogger,
  withStructuredResponse,
  zodToFlags,
} from '../../adapters/utils';
import {getSignerOrProvider, isSigner} from '../../controller/network/constants';
import {WalletConnectSigner} from '../../controller/network/walletconnect-signer';

const disconnectWalletInputs = z.object({});
type ConnectWalletInputs = z.infer<typeof disconnectWalletInputs>;

const disconnnectWalletOutputs = z.object({
  address: z.string({description: 'The address that was disconnected'}).optional(),
});

export async function disconnectWalletAdapter(
  args: ConnectWalletInputs,
  logger: Logger
): Promise<z.infer<typeof disconnnectWalletOutputs>> {
  const signer = await getSignerOrProvider(SQNetworks.MAINNET, logger, undefined, false);

  if (!isSigner(signer)) {
    logger.warn('No existing account connected');
    return {};
  }
  const address = await signer.getAddress();
  if (signer instanceof WalletConnectSigner) {
    await signer.disconnect();
    await signer.closeConnection();
  } else {
    logger.warn('The current account is not connected via WalletConnect, so it cannot be disconnected');
  }

  return {
    address,
  };
}

export default class DisconnectWallet extends Command {
  static description = 'Disconnect a wallet connected via WalletConnect';
  static flags = zodToFlags(disconnectWalletInputs);

  async run(): Promise<void> {
    const {flags} = await this.parse(DisconnectWallet);

    const {address} = await disconnectWalletAdapter(flags, commandLogger(this));

    if (!address) {
      this.log('No account to disconnect');
    } else {
      this.log(`Disconnected account: ${address}.`);
    }

    // Exit with success, walletconnect will keep things running
    this.exit(0);
  }
}

export function registerDisconnectWalletMCPTool(server: McpServer): RegisteredTool {
  return server.registerTool(
    `network.${DisconnectWallet.name}`,
    {
      description: DisconnectWallet.description,
      inputSchema: disconnectWalletInputs.shape,
      outputSchema: getMCPStructuredResponse(disconnnectWalletOutputs).shape,
    },
    withStructuredResponse(async (args) => {
      const logger = mcpLogger(server.server);
      return disconnectWalletAdapter(args, logger);
    })
  );
}
