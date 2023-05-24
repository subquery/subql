// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import {Command, Flags} from '@oclif/core';
import {getProjectRootAndManifest, getSchemaPath} from '@subql/common';
import {codegen} from '../controller/codegen-controller';

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

    const projectPath = path.resolve(file ?? location ?? process.cwd());

    const {manifests} = getProjectRootAndManifest(projectPath);

    let firstSchemaPath: string | null = null;

    for (const manifest of manifests) {
      const [fileDir, fileName] = [path.dirname(manifest), path.basename(manifest)];
      const schemaPath = getSchemaPath(fileDir, fileName);

      if (firstSchemaPath === null) {
        firstSchemaPath = schemaPath;
      } else if (schemaPath !== firstSchemaPath) {
        throw new Error('All schema paths are not the same');
      }
    }

    try {
      for (const manifest of manifests) {
        const [fileDir, fileName] = [path.dirname(manifest), path.basename(manifest)];
        if (!fileDir) {
          throw new Error('Cannot resolve project manifest from --file argument given');
        }
        await codegen(fileDir, fileName);
      }
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
  }
}
