// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

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
  extractNetworkFromManifest,
  improveProjectInfo,
  migrateAbis,
  migrateManifest,
  migrateSchema,
  prepareProject,
  readSubgraphManifest,
} from '../controller/migrate';

export default class Migrate extends Command {
  static description = 'Schema subgraph project to subquery project';

  static flags = {
    file: Flags.string({char: 'f', description: 'specify subgraph file/directory path'}),
    output: Flags.string({char: 'o', description: 'Output subquery project path', required: false}),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Migrate);
    const {file: subgraphPath, output: subqlPath} = flags;
    if (!subgraphPath || !subqlPath) {
      this.error(`subgraph directory or subquery project directory is not defined`);
    }
    const githubRegex = /^https:\/\/github\.com\/([^/]+)\/([^/]+)(?:\/tree\/([^/]+))?/;
    const gitMatch = subgraphPath.match(githubRegex);
    // will return false if directory not exist
    const direMatch: boolean = lstatSync(subgraphPath, {throwIfNoEntry: false})?.isDirectory() ?? false;

    const parsedSubqlPath = path.parse(subqlPath);
    // We don't need to check output directory is existing or not
    const subqlDir = parsedSubqlPath.ext === '' ? subqlPath : parsedSubqlPath.dir;

    let subgraphDir: string;
    let tempSubgraphDir: string | undefined;

    if (gitMatch) {
      tempSubgraphDir = await makeTempDir();
      const [, domain, repository, branch] = gitMatch;
      const finalBranch = branch || 'master'; // default to master
      subgraphDir = tempSubgraphDir;
      console.log(`Pull subgraph project from git: ${domain}/${repository}, branch: ${finalBranch}`);
      await git().clone(`https://github.com/${domain}/${repository}`, subgraphDir, [
        '-b',
        finalBranch,
        '--single-branch',
      ]);
    } else if (direMatch) {
      subgraphDir = subgraphPath;
    } else {
      this.error(`Subgraph project should be a github link or file directory`);
    }

    const subgraphManifestPath = path.join(subgraphDir, DEFAULT_SUBGRAPH_MANIFEST);
    const subgraphSchemaPath = path.join(subgraphDir, DEFAULT_SUBGRAPH_SCHEMA);
    const subqlManifestPath = path.join(subqlDir, DEFAULT_SUBQL_MANIFEST);
    const subqlSchemaPath = path.join(subqlDir, DEFAULT_SUBQL_SCHEMA);

    try {
      cli.action.start('Preparing to migrate project');
      const subgraphManifest = readSubgraphManifest(subgraphManifestPath);
      improveProjectInfo(subgraphDir, subgraphManifest);
      const chainInfo = extractNetworkFromManifest(subgraphManifest);
      await prepareProject(chainInfo, subqlDir);
      await migrateAbis(subgraphManifest, subgraphDir, subqlDir);
      await migrateManifest(chainInfo, subgraphManifest, subqlManifestPath);
      // render package.json
      await preparePackage(subqlDir, {
        name: subgraphManifest.name,
        description: subgraphManifest.description,
        author: subgraphManifest.author,
        endpoint: [],
      });
      await migrateSchema(subqlSchemaPath, subgraphSchemaPath);
      // TODO , await migrateMapping(theGraphChainInfo.networkFamily, subgraphManifestPath,subqlManifestPath)
      // Will be nice we can lint the output project
      cli.action.stop();
      this.log(`Output migrated SubQuery project to ${subqlDir}`);
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
