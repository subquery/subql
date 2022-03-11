// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import {Command, Flags} from '@oclif/core';
import {loadSubstrateProjectManifest, SubstrateProjectManifestVersioned} from '@subql/common-substrate';
import {loadTerraProjectManifest, TerraProjectManifestVersioned} from '@subql/common-terra';
import {migrate, prepare} from '../controller/migrate-controller';

export default class Migrate extends Command {
  static description = 'Migrate Subquery project manifest v0.0.1 to v0.2.0';

  static flags = {
    force: Flags.boolean({char: 'f'}),
    file: Flags.string(),
    location: Flags.string({char: 'l', description: 'local folder to run migrate in'}),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Migrate);
    const location = flags.location ? path.resolve(flags.location) : process.cwd();
    let manifest: SubstrateProjectManifestVersioned | TerraProjectManifestVersioned;
    try {
      manifest = loadSubstrateProjectManifest(location);
    } catch (e) {
      try {
        manifest = loadTerraProjectManifest(location);
      } catch (e) {
        this.error(`Please validate project manifest before migrate. \n ${e}`);
      }
    }
    if (manifest.isV1_0_0) {
      this.log(`* You are already using manifest spec v1.0.0`);
    } else {
      console.log(`* Converting manifest to v1.0.0, please provide:`);
      const [project, chainTypesRelativePath] = await prepare(location, manifest);
      await migrate(location, project, manifest, chainTypesRelativePath);
      this.log('* Migration completed');
      process.exit(0);
    }
  }
}
