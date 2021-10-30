// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import {Command, flags} from '@oclif/command';
import {loadProjectManifest, ProjectManifestVersioned} from '@subql/common';
import {migrate, prepare} from '../controller/migrate-controller';

export default class Migrate extends Command {
  static description = 'Migrate Subquery project manifest v0.0.1 to v0.2.0';

  static flags = {
    force: flags.boolean({char: 'f'}),
    file: flags.string(),
    location: flags.string({char: 'l', description: 'local folder to run migrate in'}),
  };

  async run(): Promise<void> {
    const {flags} = this.parse(Migrate);
    const location = flags.location ? path.resolve(flags.location) : process.cwd();
    let manifest: ProjectManifestVersioned;
    try {
      manifest = loadProjectManifest(location);
    } catch (e) {
      this.error(`Please validate project manifest before migrate. \n ${e}`);
    }
    if (manifest.isV0_2_0) {
      this.log(`* You are already using manifest spec v0.2.0`);
    } else {
      console.log(`* Converting manifest v0.0.1 to v0.2.0, please provide:`);
      const [project, chainTypesRelativePath] = await prepare(location, manifest);
      await migrate(location, project, manifest, chainTypesRelativePath);
      this.log('* Migration completed');
      process.exit(0);
    }
  }
}
