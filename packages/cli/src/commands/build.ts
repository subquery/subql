// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'node:assert';
import {existsSync, lstatSync} from 'node:fs';
import path from 'node:path';
import {McpServer, RegisteredTool} from '@modelcontextprotocol/sdk/server/mcp';
import {Command} from '@oclif/core';
import {glob} from 'glob';
import {z} from 'zod';
import {Logger, zodToFlags, mcpLogger, commandLogger, getMCPWorkingDirectory, zodToArgs} from '../adapters/utils';
import {getBuildEntries, runBundle} from '../controller/build-controller';
import {resolveToAbsolutePath, buildTsManifest} from '../utils';

export const buildInputs = z.object({
  location: z
    .string({description: 'The path to the project, this can be a directory or a project manifest file.'})
    .optional(),
  output: z.string({description: 'The output location relative to the location'}).optional().default('dist'),
});
type BuildInputs = z.infer<typeof buildInputs>;

const buildOutputs = z.void();

export async function buildAdapter(
  workingDir: string,
  args: BuildInputs,
  logger: Logger
): Promise<z.infer<typeof buildOutputs>> {
  const location = resolveToAbsolutePath(path.resolve(workingDir, args.location ?? ''));
  assert(existsSync(location), 'Argument `location` is not a valid directory or file');

  const directory = lstatSync(location).isDirectory() ? location : path.dirname(location);

  await buildTsManifest(location, logger.info.bind(logger));

  // Check that this is a SubQuery project
  const projectSearch = path.resolve(
    directory,
    `./{project*.{yaml,yml},subquery-multichain.yaml${directory !== location ? `,${path.basename(location)}` : ''}}`
  );
  const manifests = await glob(projectSearch, {windowsPathsNoEscape: true});
  if (!manifests.length) {
    throw new Error(
      'This is not a SubQuery project, please make sure you run this in the root of your project directory.'
    );
  }

  const buildEntries = getBuildEntries(directory, logger);
  const outputDir = path.resolve(directory, args.output);

  await runBundle(buildEntries, directory, outputDir, false, true, logger);
}

export default class Build extends Command {
  static description = 'Build this SubQuery project code into a bundle';
  static flags = zodToFlags(buildInputs.omit({location: true}));
  static args = zodToArgs(buildInputs.pick({location: true}));

  async run(): Promise<void> {
    const {args, flags} = await this.parse(Build);
    try {
      await buildAdapter(process.cwd(), {...args, ...flags}, commandLogger(this));
      this.log('Project built successfully!');
    } catch (e: any) {
      this.error(e);
    }
  }
}

export function registerBuildMCPTool(server: McpServer): RegisteredTool {
  return server.registerTool(
    Build.name,
    {
      description: Build.description,
      inputSchema: buildInputs.shape,
      // outputSchema: buildOutputs.shape,
    },
    async (args) => {
      const cwd = await getMCPWorkingDirectory(server);
      await buildAdapter(cwd, args, mcpLogger(server.server));

      return {
        content: [
          {
            type: 'text',
            text: `${Build.name} completed successfully.`,
          },
        ],
      };
    }
  );
}
