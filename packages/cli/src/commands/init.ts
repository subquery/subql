// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import path from 'path';
import {Command, flags} from '@oclif/command';
import cli from 'cli-ux';
import {createProject} from '../controller/init-controller';
import {ProjectSpec} from '../types';

export default class Init extends Command {
  static description = 'Init a scaffold subquery project';

  static flags = {
    force: flags.boolean({char: 'f'}),
    starter: flags.boolean({
      default: true,
    }),
  };

  static args = [
    {
      name: 'projectName',
      description: 'Give the starter project name',
    },
  ];

  async run(): Promise<void> {
    const {args, flags} = this.parse(Init);
    const project = {} as ProjectSpec;

    project.name = args.projectName
      ? args.projectName
      : await cli.prompt('Project name', {default: 'subql-starter', required: true});
    if (fs.existsSync(path.join(process.cwd(), `${project.name}`))) {
      throw new Error(`Directory ${project.name} exists, try another project name`);
    }
    project.repository = await cli.prompt('Git repository', {required: false});
    project.endpoint = await cli.prompt('RPC endpoint', {
      default: 'wss://polkadot.api.onfinality.io/public-ws',
      required: true,
    });
    project.author = await cli.prompt('Authors', {required: true});
    project.description = await cli.prompt('Description', {required: false});
    project.version = await cli.prompt('Version:', {default: '1.0.0', required: true});
    project.license = await cli.prompt('License:', {default: 'Apache-2.0', required: true});

    if (flags.starter && project.name) {
      cli.action.start('Init the starter package');
      try {
        await createProject(process.cwd(), project);
        cli.action.stop(`${project.name} is ready`);
      } catch (e) {
        /* handle all errors here */
        console.error(e.message);
        process.exit(1);
      }
    }
  }
}
