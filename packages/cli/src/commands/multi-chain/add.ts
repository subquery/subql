// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import path from 'node:path';
import {McpServer, RegisteredTool} from '@modelcontextprotocol/sdk/server/mcp';
import {Command} from '@oclif/core';
import {z} from 'zod';
import {getMCPWorkingDirectory, zodToArgs, zodToFlags} from '../../adapters/utils';
import {addChain} from '../../controller/add-chain-controller';

const multichainAddInputs = z.object({
  location: z
    .string({
      description: 'The path to the multichain project, this can be a directory or a multichain manifest file.',
    })
    .optional(),
  chainManifestFile: z.string({description: 'The path to the new chain manifest'}),
});
type MultichainAddInputs = z.infer<typeof multichainAddInputs>;

const multichainAddOutputs = z.void();

async function multichainAddAdapter(
  workingDir: string,
  args: MultichainAddInputs
): Promise<z.infer<typeof multichainAddOutputs>> {
  const location = path.resolve(workingDir, args.location ?? '');
  const chainManifestFile = path.resolve(workingDir, args.chainManifestFile);
  await addChain(location, chainManifestFile);
}

export default class MultiChainAdd extends Command {
  static description = 'Add new chain manifest to multi-chain project';
  static flags = zodToFlags(multichainAddInputs.omit({location: true}));
  static args = zodToArgs(multichainAddInputs.pick({location: true}));

  async run(): Promise<void> {
    const {args, flags} = await this.parse(MultiChainAdd);

    return multichainAddAdapter(process.cwd(), {...args, ...flags});
  }
}

export function registerMultichainAddMCPTool(server: McpServer): RegisteredTool {
  return server.registerTool(
    `multichain.${MultiChainAdd.name}`,
    {
      description: MultiChainAdd.description,
      inputSchema: multichainAddInputs.shape,
    },
    async (args) => {
      const cwd = await getMCPWorkingDirectory(server);
      await multichainAddAdapter(cwd, args);
      return {
        content: [
          {
            type: 'text',
            text: `Added chain to multi-chain project`,
          },
        ],
      };
    }
  );
}
