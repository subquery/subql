// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'node:assert';
import {existsSync, lstatSync} from 'node:fs';
import path from 'node:path';
import {McpServer, RegisteredTool} from '@modelcontextprotocol/sdk/server/mcp';
import {Command} from '@oclif/core';
import {z} from 'zod';
import {Logger, zodToFlags, mcpLogger, commandLogger, zodToArgs} from '../adapters/utils';
import {getBuildEntries, runBundle} from '../controller/build-controller';
import {resolveToAbsolutePath, buildTsManifest} from '../utils';

// TODO look into zod registries to get shorthand form of flags

export const buildInputs = z.object({
  location: z.string({description: 'The path to the project, this can be a directory or a project manifest file.'}),
  output: z.string({description: 'The output location relative to the location'}).optional().default('dist'),
});
type BuildInputs = z.infer<typeof buildInputs>;

const buildOutputs = z.void();

// type Adapter = <I, O>(args: I, logger: Logger, prompt: <T>(options?: T[]) => Promise<T>) => Promise<O>;

export async function buildAdapter(args: BuildInputs, logger: Logger): Promise<z.infer<typeof buildOutputs>> {
  const location = resolveToAbsolutePath(args.location);
  assert(existsSync(location), 'Argument `location` is not a valid directory or file');
  const directory = lstatSync(location).isDirectory() ? location : path.dirname(location);

  await buildTsManifest(location, logger.info.bind(logger));

  const buildEntries = getBuildEntries(directory);
  const outputDir = path.resolve(directory, args.output);

  await runBundle(buildEntries, directory, outputDir, false, true);
}

export default class Build extends Command {
  static description = 'Build this SubQuery project code into a bundle';
  static flags = zodToFlags(buildInputs.omit({location: true}));
  static args = zodToArgs(buildInputs.pick({location: true}));

  async run(): Promise<void> {
    const {args, flags} = await this.parse(Build);

    await buildAdapter({...flags, ...args}, commandLogger(this));
    // TODO handle errors
  }
}

const mcpBuildInputs = buildInputs.merge(
  z.object({
    cwd: z.string({description: 'The current working directory.'}),
  })
);

export function registerBuildMCPTool(server: McpServer): RegisteredTool {
  return server.registerTool(
    Build.id,
    {
      description: Build.description,
      inputSchema: mcpBuildInputs.shape,
      // outputSchema: buildOutputs.shape,
    },
    async (args, meta) => {
      const {cwd, location, ...rest} = args;
      const newLocation = path.resolve(cwd, location);

      // TODO make the location absolute, with MCP cwd is irrelevant
      await buildAdapter({...rest, location: newLocation}, mcpLogger(server.server));

      // TODO mock progress

      return {
        content: [
          {
            type: 'text',
            text: `${Build.id} completed successfully.`,
          },
        ],
      };
    }
  );
}
