// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'node:assert';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {McpServer, RegisteredTool} from '@modelcontextprotocol/sdk/server/mcp';
import {Command} from '@oclif/core';
import {z} from 'zod';
import {Logger, zodToFlags, mcpLogger, commandLogger, getMCPWorkingDirectory, zodToArgs} from '../adapters/utils';
import {resolveToAbsolutePath, buildTsManifest} from '../utils';

export const buildManifestInputs = z.object({
  location: z
    .string({description: 'The path to the project, this can be a directory or a project manifest file.'})
    .optional(),
});
type BuildManifestInputs = z.infer<typeof buildManifestInputs>;

const buildManifestOutputs = z.void();

export async function buildManifestAdapter(
  workingDir: string,
  args: BuildManifestInputs,
  logger: Logger
): Promise<z.infer<typeof buildManifestOutputs>> {
  const location = resolveToAbsolutePath(path.resolve(workingDir, args.location ?? ''));
  assert(existsSync(location), 'Argument `location` is not a valid directory or file');

  await buildTsManifest(location, logger.info.bind(logger));

  logger.info('TypeScript manifest compiled successfully to project.yaml');
}

export default class BuildManifest extends Command {
  static description = 'Build TypeScript manifest file to YAML (generates project.yaml from project.ts)';
  static flags = zodToFlags(buildManifestInputs.omit({location: true}));
  static args = zodToArgs(buildManifestInputs.pick({location: true}));

  async run(): Promise<void> {
    const {args, flags} = await this.parse(BuildManifest);
    try {
      await buildManifestAdapter(process.cwd(), {...args, ...flags}, commandLogger(this));
      this.log('TypeScript manifest built successfully!');
    } catch (e: any) {
      this.error(e);
    }
  }
}

export function registerBuildManifestMCPTool(server: McpServer): RegisteredTool {
  return server.registerTool(
    BuildManifest.name,
    {
      description: BuildManifest.description,
      inputSchema: buildManifestInputs.shape,
      // outputSchema: buildManifestOutputs.shape,
    },
    async (args) => {
      const cwd = await getMCPWorkingDirectory(server);
      await buildManifestAdapter(cwd, args, mcpLogger(server.server));

      return {
        content: [
          {
            type: 'text',
            text: `${BuildManifest.name} completed successfully.`,
          },
        ],
      };
    }
  );
}
