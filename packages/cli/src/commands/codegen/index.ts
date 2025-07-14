// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'node:assert';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {McpServer, RegisteredTool} from '@modelcontextprotocol/sdk/server/mcp';
import {Command} from '@oclif/core';
import {getProjectRootAndManifest, getSchemaPath} from '@subql/common';
import {z} from 'zod';
import {commandLogger, getMCPWorkingDirectory, Logger, mcpLogger, zodToArgs} from '../../adapters/utils';
import {codegen} from '../../controller/codegen-controller';
import {resolveToAbsolutePath, buildManifestFromLocation, getTsManifest} from '../../utils';

const codegenInputs = z.object({
  location: z.string({description: 'The project directory or path to project manifest.'}).optional(),
});
type CodegenInputs = z.infer<typeof codegenInputs>;

const codegenOutputs = z.void();

export async function codegenAdapter(
  workingDir: string,
  args: CodegenInputs,
  logger: Logger
): Promise<z.infer<typeof codegenOutputs>> {
  const location = resolveToAbsolutePath(path.resolve(workingDir, args.location ?? ''));
  assert(existsSync(location), 'Argument `location` is not a valid directory or file');

  /*
    ts manifest can be either single chain ts manifest
    or multichain ts manifest
    or multichain yaml manifest containing single chain ts project paths
  */
  const tsManifest = getTsManifest(location);

  if (tsManifest) {
    await buildManifestFromLocation(tsManifest, logger.info.bind(logger));
  }

  const {manifests, root} = getProjectRootAndManifest(location);

  let firstSchemaPath: string | null = null;

  for (const manifest of manifests) {
    const schemaPath = getSchemaPath(root, manifest);

    if (firstSchemaPath === null) {
      firstSchemaPath = schemaPath;
    } else if (schemaPath !== firstSchemaPath) {
      throw new Error('All schema paths are not the same');
    }
  }

  await codegen(root, manifests);
}

export default class Codegen extends Command {
  static description = 'Generate entity types from the GraphQL schema and contract interfaces';
  static args = zodToArgs(codegenInputs);

  async run(): Promise<void> {
    const {args} = await this.parse(Codegen);

    try {
      await codegenAdapter(process.cwd(), args, commandLogger(this));
    } catch (err: any) {
      this.error(`${err.message}, ${err.cause}`);
    }
  }
}

export function registerCodegenMCPTool(server: McpServer): RegisteredTool {
  return server.registerTool(
    Codegen.name,
    {
      description: Codegen.description,
      inputSchema: codegenInputs.shape,
    },
    async (args, meta) => {
      const cwd = await getMCPWorkingDirectory(server);

      await codegenAdapter(cwd, args, mcpLogger(server.server));

      return {
        content: [
          {
            type: 'text',
            text: `${Codegen.name} completed successfully.`,
          },
        ],
      };
    }
  );
}
