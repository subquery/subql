// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import path from 'path';
import {Command, flags} from '@oclif/command';
import cli from 'cli-ux';
import {createProject, installDependencies} from '../controller/init-controller';
import {ProjectSpec} from '../types';

export default class Init extends Command {
  static description = 'Init a scaffold subquery project';

  static flags = {
    force: flags.boolean({char: 'f'}),
    starter: flags.boolean({
      default: true,
    }),
    location: flags.string({char: 'l', description: 'local folder to create the project in'}),
    'install-dependencies': flags.boolean({description: 'Install dependencies as well', default: false}),
    npm: flags.boolean({description: 'Force using NPM instead of yarn, only works with `install-dependencies` flag'}),
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

    const location = flags.location ? path.resolve(flags.location) : process.cwd();

    project.name = args.projectName
      ? args.projectName
      : await cli.prompt('Project name', {default: 'subql-starter', required: true});
    if (fs.existsSync(path.join(location, `${project.name}`))) {
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
        const projectPath = await createProject(location, project);
        cli.action.stop();

        if (flags['install-dependencies']) {
          cli.action.start('Installing dependencies');
          installDependencies(projectPath, flags.npm);
          cli.action.stop();
        }

        this.log(`${project.name} is ready`);
      } catch (e) {
        /* handle all errors here */
        this.error(e.message);
      }
    }
  }
}
