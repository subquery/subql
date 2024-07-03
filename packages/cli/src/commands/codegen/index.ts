// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Command, Flags} from '@oclif/core';
import {getProjectRootAndManifest, getSchemaPath} from '@subql/common';
import {codegen} from '../../controller/codegen-controller';
import {resolveToAbsolutePath, buildManifestFromLocation, getTsManifest} from '../../utils';

export default class Codegen extends Command {
  static description = 'Generate schemas for graph node';

  static flags = {
    location: Flags.string({
      char: 'l',
      description: '[deprecated] local folder to run codegen in. please use file flag instead',
    }),
    file: Flags.string({char: 'f', description: 'specify manifest file path (will overwrite -l if both used)'}),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(Codegen);
    this.log('===============================');
    this.log('---------Subql Codegen---------');
    this.log('===============================');

    const {file, location} = flags;

    const projectPath = resolveToAbsolutePath(file ?? location ?? process.cwd());

    /*
      ts manifest can be either single chain ts manifest
      or multichain ts manifest
      or multichain yaml manifest containing single chain ts project paths
    */
    const tsManifest = getTsManifest(projectPath);

    if (tsManifest) {
      await buildManifestFromLocation(tsManifest, this.log.bind(this));
    }

    const {manifests, root} = getProjectRootAndManifest(projectPath);

    let firstSchemaPath: string | null = null;

    for (const manifest of manifests) {
      const schemaPath = getSchemaPath(root, manifest);

      if (firstSchemaPath === null) {
        firstSchemaPath = schemaPath;
      } else if (schemaPath !== firstSchemaPath) {
        throw new Error('All schema paths are not the same');
      }
    }

    try {
      await codegen(root, manifests);
    } catch (err: any) {
      console.error(err.message, err.cause);
      process.exit(1);
    }
  }
}
