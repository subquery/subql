// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import fs, {lstatSync} from 'fs';
import path from 'path';
import {McpServer, RegisteredTool} from '@modelcontextprotocol/sdk/server/mcp';
import {Command} from '@oclif/core';
import {makeTempDir} from '@subql/common';
import git from 'simple-git';
import {z} from 'zod';
import {
  commandLogger,
  getMCPStructuredResponse,
  getMCPWorkingDirectory,
  Logger,
  mcpLogger,
  withStructuredResponse,
  zodToFlags,
} from '../adapters/utils';
import {
  DEFAULT_SUBGRAPH_MANIFEST,
  DEFAULT_SUBGRAPH_SCHEMA,
  DEFAULT_SUBQL_MANIFEST,
  DEFAULT_SUBQL_SCHEMA,
} from '../constants';
import {preparePackage} from '../controller/init-controller';
import {
  extractGitInfo,
  extractNetworkFromManifest,
  improveProjectInfo,
  migrateAbis,
  migrateManifest,
  migrateSchema,
  prepareProject,
  readSubgraphManifest,
  subgraphValidation,
} from '../controller/migrate';
import {migrateMapping} from '../controller/migrate/mapping/migrate-mapping.controller';

const migrateSubgraphInputs = z.object({
  input: z.string({description: 'A directory or git repo to a subgraph project'}),
  output: z.string({description: 'The location of the SubQuery project'}),
  gitSubDirectory: z.string({description: 'A subdirectory in the git repo if the input is a git repo'}).optional(),
});
type MigrateSubgraphInputs = z.infer<typeof migrateSubgraphInputs>;

const migrateSubgraphOutputs = z.object({
  output: z.string({description: 'The output path'}),
});

async function migrateSubgraphAdapter(
  workingDir: string,
  args: MigrateSubgraphInputs,
  logger: Logger
): Promise<z.infer<typeof migrateSubgraphOutputs>> {
  const gitMatch = extractGitInfo(args.input);

  const parsedSubqlPath = path.parse(path.resolve(workingDir, args.output));
  // We don't need to check output directory is existing or not
  const subqlDir = parsedSubqlPath.ext === '' ? args.output : parsedSubqlPath.dir;
  let subgraphDir: string;
  let tempSubgraphDir: string | undefined;
  if (gitMatch) {
    tempSubgraphDir = await makeTempDir();
    const {branch, link} = gitMatch;
    // clone the subdirectory project
    if (args.gitSubDirectory) {
      subgraphDir = path.join(tempSubgraphDir, args.gitSubDirectory);
      await git(tempSubgraphDir).init().addRemote('origin', link);
      await git(tempSubgraphDir).raw('sparse-checkout', 'set', args.gitSubDirectory);
      assert(branch, 'Branch is required for git subdirectory');
      await git(tempSubgraphDir).raw('pull', 'origin', branch);
    } else {
      subgraphDir = tempSubgraphDir;
      await git().clone(link, subgraphDir, branch ? ['-b', branch, '--single-branch'] : ['--single-branch']);
    }
    logger.info(
      `* Pull subgraph project from git: ${link}, branch: ${branch ?? 'default branch'}${
        args.gitSubDirectory ? `, subdirectory:${args.gitSubDirectory}` : '.'
      }`
    );
  } else {
    // will return false if directory not exist
    if (lstatSync(path.resolve(workingDir, args.input), {throwIfNoEntry: false})?.isDirectory()) {
      if (args.gitSubDirectory) {
        logger.warn(`Git sub directory only works with git path, not local directories.`);
      }
      subgraphDir = args.input;
    } else {
      throw new Error(`Subgraph project should be a git ssh/link or file directory`);
    }
  }

  const subgraphManifestPath = path.join(subgraphDir, DEFAULT_SUBGRAPH_MANIFEST);
  const subgraphSchemaPath = path.join(subgraphDir, DEFAULT_SUBGRAPH_SCHEMA);
  const subqlManifestPath = path.join(subqlDir, DEFAULT_SUBQL_MANIFEST);
  const subqlSchemaPath = path.join(subqlDir, DEFAULT_SUBQL_SCHEMA);

  try {
    const subgraphManifest = readSubgraphManifest(subgraphManifestPath, subgraphDir);
    improveProjectInfo(subgraphDir, subgraphManifest);
    subgraphValidation(subgraphManifest);
    const chainInfo = await extractNetworkFromManifest(subgraphManifest);
    await prepareProject(chainInfo, subqlDir);
    await migrateAbis(subgraphManifest, subgraphDir, subqlDir);
    await migrateManifest(chainInfo, subgraphManifest, subqlManifestPath);
    // render package.json
    await preparePackage(subqlDir, {
      name: subgraphManifest.name ?? '',
      description: subgraphManifest.description,
      author: subgraphManifest.author ?? '',
      endpoint: [],
    });
    await migrateSchema(subgraphSchemaPath, subqlSchemaPath);
    await migrateMapping(subgraphDir, subqlDir);
    logger.info(`* Output migrated SubQuery project to ${subqlDir}`);
  } catch (e) {
    fs.rmSync(subqlDir, {recursive: true, force: true});
    throw new Error(`Migrate project failed: ${e}`);
  } finally {
    // Clean project folder, only remove temp dir project, if user provide local project DO NOT REMOVE
    if (tempSubgraphDir !== undefined) {
      logger.info('Cleaning up temp git directory');
      fs.rmSync(tempSubgraphDir, {recursive: true, force: true});
    }
  }

  return {
    output: subqlDir,
  };
}

export default class MigrateSubgraph extends Command {
  static description = 'Migrate a Subgraph project to a SubQuery project, including the manifest and schema.';
  static flags = zodToFlags(migrateSubgraphInputs);

  async run(): Promise<void> {
    const {flags} = await this.parse(MigrateSubgraph);

    const {output} = await migrateSubgraphAdapter(process.cwd(), flags, commandLogger(this));

    this.log(`Output migrated SubQuery project to ${output}`);
  }
}

export function registerMigrateSubgraphMCPTool(server: McpServer): RegisteredTool {
  return server.registerTool(
    MigrateSubgraph.name,
    {
      description: MigrateSubgraph.description,
      inputSchema: migrateSubgraphInputs.shape,
      outputSchema: getMCPStructuredResponse(migrateSubgraphOutputs).shape,
    },
    withStructuredResponse(async (args, meta) => {
      const logger = mcpLogger(server.server);
      const cwd = await getMCPWorkingDirectory(server);
      return migrateSubgraphAdapter(cwd, args, logger);
    })
  );
}
