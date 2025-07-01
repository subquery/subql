// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'node:assert';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {McpServer, RegisteredTool} from '@modelcontextprotocol/sdk/server/mcp';
import {Command} from '@oclif/core';
import {getMultichainManifestPath, getProjectRootAndManifest} from '@subql/common';
import {z} from 'zod';
import {commandLogger, Logger, mcpLogger, silentLogger, zodToArgs, zodToFlags} from '../adapters/utils';
import {createIPFSFile, uploadToIpfs} from '../controller/publish-controller';
import {getOptionalToken, resolveToAbsolutePath} from '../utils';
import {buildAdapter, buildInputs} from './build';

const publishInputs = z.object({
  location: z.string({description: 'The path to the project, this can be a directory or a project manifest file.'}),
  ipfs: z.string({description: 'An additional IPFS endpoint to upload to'}).optional(),
});
type PublishInputs = z.infer<typeof publishInputs>;

const publishOutputs = z.object({
  directory: z.string({description: 'If this is a multichain project then a directory will be created.'}).optional(),
  files: z.record(z.string(), z.string(), {
    description: 'A map of file paths to their IPFS CIDs.',
  }),
});
type PublishOutputs = z.infer<typeof publishOutputs>;

export async function publishAdapter(args: PublishInputs, logger: Logger): Promise<PublishOutputs> {
  const location = resolveToAbsolutePath(args.location);
  assert(existsSync(location), 'Argument `location` is not a valid directory or file');

  // Ensure the project is built
  await buildAdapter(buildInputs.parse({location}), logger);

  const project = getProjectRootAndManifest(location);

  const fullPaths = project.manifests.map((manifest) => path.join(project.root, manifest));

  let multichainManifestPath = getMultichainManifestPath(location);
  if (multichainManifestPath) {
    multichainManifestPath = path.join(project.root, multichainManifestPath);
  }

  const authToken = getOptionalToken();
  const fileToCidMap = await uploadToIpfs(fullPaths, authToken?.trim(), multichainManifestPath, args.ipfs);

  await Promise.all(
    project.manifests.map((manifest) => {
      const cid = fileToCidMap.get(manifest);
      assert(cid, `CID for ${manifest} not found`);
      return createIPFSFile(project.root, manifest, cid);
    })
  );

  const directoryCid = Array.from(fileToCidMap).find(([file]) => file === '');

  return {
    directory: directoryCid?.[1],
    files: Object.fromEntries(Array.from(fileToCidMap).filter(([file]) => file !== '')),
  };
}

const extraCommandFlags = z.object({
  silent: z.boolean({description: 'Run the command without logging, only outputs the CIDs'}).optional().default(false),
});
export default class Publish extends Command {
  static description = 'Upload this SubQuery project to IPFS for distribution';
  static flags = zodToFlags(publishInputs.omit({location: true}).merge(extraCommandFlags));
  static args = zodToArgs(publishInputs.pick({location: true}));

  async run(): Promise<void> {
    const {args, flags} = await this.parse(Publish);

    const logger = flags.silent ? silentLogger() : commandLogger(this);

    const result = await publishAdapter({...flags, ...args}, logger);

    if (flags.silent) {
      this.log(result.directory);
      Object.entries(result.files).map(([file, cid]) => {
        this.log(cid);
      });
    } else {
      if (result.directory) {
        this.log(`SubQuery Multichain Project uploaded to IPFS: ${result.directory}`);
      }
      Object.entries(result.files).forEach(([file, cid]) => {
        this.log(`${result.directory ? '- This includes' : 'SubQuery Project'} ${file} uploaded to IPFS: ${cid}`);
      });
    }
  }
}

const mcpPublishInputs = publishInputs.merge(
  z.object({
    cwd: z.string({description: 'The current working directory.'}),
  })
);

const mcpPublishOutputs = z.object({
  result: z.optional(publishOutputs),
  error: z.optional(z.string().describe('Error message if the command fails')),
});

function formatErrorCauses(e: Error): string {
  let message = e.message;
  while (e.cause) {
    e = e.cause as Error;
    message += `:\n cause: ${e.message}`;
  }
  return message;
}

export function registerPublishMCPTool(server: McpServer): RegisteredTool {
  return server.registerTool(
    Publish.id,
    {
      description: Publish.description,
      inputSchema: mcpPublishInputs.shape,
      outputSchema: mcpPublishOutputs.shape,
    },
    async (args, meta) => {
      try {
        const {cwd, location, ...rest} = args;
        const newLocation = path.resolve(cwd, location);

        const logger = mcpLogger(server.server);
        const result = await publishAdapter({...rest, location: newLocation}, logger);

        return {
          structuredContent: {
            result,
          },
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (e: any) {
        return {
          structuredContent: {
            error: formatErrorCauses(e),
          },
          content: [
            {
              type: 'text',
              text: `Error running: ${formatErrorCauses(e)}`,
            },
          ],
        };
      }
    }
  );
}
