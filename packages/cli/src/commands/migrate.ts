// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import fs, {lstatSync} from 'fs';
import path from 'path';
import {Command, Flags} from '@oclif/core';
import {makeTempDir} from '@subql/common';
import cli from 'cli-ux';
import git from 'simple-git';
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

export default class Migrate extends Command {
  static description = 'Schema subgraph project to subquery project';

  static flags = {
    gitSubDirectory: Flags.string({char: 'd', description: 'specify git subdirectory path'}),
    file: Flags.string({char: 'f', description: 'specify subgraph git/directory path'}),
    output: Flags.string({char: 'o', description: 'Output subquery project path', required: false}),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Migrate);
    const {file, gitSubDirectory, output} = flags;

    const subgraphPath = file ?? (await cli.prompt('Subgraph project path, local or git', {required: true}));
    const subqlPath = output ?? (await cli.prompt('SubQuery project path, local or git', {required: true}));

    const gitMatch = extractGitInfo(subgraphPath);
    // will return false if directory not exist
    const direMatch: boolean = lstatSync(subgraphPath, {throwIfNoEntry: false})?.isDirectory() ?? false;

    const parsedSubqlPath = path.parse(subqlPath);
    // We don't need to check output directory is existing or not
    const subqlDir = parsedSubqlPath.ext === '' ? subqlPath : parsedSubqlPath.dir;
    let subgraphDir: string;
    let tempSubgraphDir: string | undefined;
    if (gitMatch) {
      tempSubgraphDir = await makeTempDir();
      const {branch, link} = gitMatch;
      // clone the subdirectory project
      if (gitSubDirectory) {
        subgraphDir = path.join(tempSubgraphDir, gitSubDirectory);
        await git(tempSubgraphDir).init().addRemote('origin', link);
        await git(tempSubgraphDir).raw('sparse-checkout', 'set', `${gitSubDirectory}`);
        assert(branch, 'Branch is required for git subdirectory');
        await git(tempSubgraphDir).raw('pull', 'origin', branch);
      } else {
        subgraphDir = tempSubgraphDir;
        await git().clone(link, subgraphDir, branch ? ['-b', branch, '--single-branch'] : ['--single-branch']);
      }
      console.log(
        `* Pull subgraph project from git: ${link}, branch: ${branch ?? 'default branch'}${
          gitSubDirectory ? `, subdirectory:${gitSubDirectory}` : '.'
        }`
      );
    } else if (direMatch) {
      if (gitSubDirectory) {
        this.error(`Git sub directory only works with git path, not local directories.`);
      }
      subgraphDir = subgraphPath;
    } else {
      this.error(`Subgraph project should be a git ssh/link or file directory`);
    }

    const subgraphManifestPath = path.join(subgraphDir, DEFAULT_SUBGRAPH_MANIFEST);
    const subgraphSchemaPath = path.join(subgraphDir, DEFAULT_SUBGRAPH_SCHEMA);
    const subqlManifestPath = path.join(subqlDir, DEFAULT_SUBQL_MANIFEST);
    const subqlSchemaPath = path.join(subqlDir, DEFAULT_SUBQL_SCHEMA);

    try {
      const subgraphManifest = readSubgraphManifest(subgraphManifestPath, subgraphPath);
      improveProjectInfo(subgraphDir, subgraphManifest);
      subgraphValidation(subgraphManifest);
      const chainInfo = extractNetworkFromManifest(subgraphManifest);
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
      this.log(`* Output migrated SubQuery project to ${subqlDir}`);
    } catch (e) {
      // Clean project folder, only remove temp dir project, if user provide local project DO NOT REMOVE
      if (tempSubgraphDir !== undefined) {
        fs.rmSync(tempSubgraphDir, {recursive: true, force: true});
      }
      fs.rmSync(subqlDir, {recursive: true, force: true});
      this.error(`Migrate project failed: ${e}`);
    }
  }
}
