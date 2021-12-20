// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import path from 'path';
import {NodeVM, VMScript} from '@subql/x-vm2';
import {plainToClass} from 'class-transformer';
import {validateSync} from 'class-validator';
import yaml from 'js-yaml';
import {ChainTypes} from './models';
import {ProjectManifestVersioned, VersionedProjectManifest} from './versioned';

export function loadFromFile(filePath: string): unknown {
  const {base, ext} = path.parse(filePath);

  if (ext !== '.yaml' && ext !== '.yml' && ext !== '.json' && ext !== '.js') {
    throw new Error(`Extension ${ext} not supported`);
  }

  if (ext === '.js') {
    const vm = new NodeVM({
      console: 'inherit',
      wasm: false,
      sandbox: {},
      require: {
        external: true,
        context: 'sandbox',
      },
      wrapper: 'commonjs',
      sourceExtensions: ['js', 'cjs'],
    });

    const script = new VMScript(`module.exports = require('./${base}');`, filePath);

    return vm.run(script) as unknown;
  } else {
    const rawContent = fs.readFileSync(filePath, 'utf-8');
    return yaml.load(rawContent);
  }
}

function loadFromProjectFile(file: string): unknown {
  let filePath = file;
  if (fs.existsSync(file) && fs.lstatSync(file).isDirectory()) {
    filePath = path.join(file, 'project.yaml');
  }

  return loadFromFile(filePath);
}

export function loadProjectManifest(file: string): ProjectManifestVersioned {
  const doc = loadFromProjectFile(file);
  const projectManifest = new ProjectManifestVersioned(doc as VersionedProjectManifest);
  projectManifest.validate();
  return projectManifest;
}

export function parseChainTypes(raw: unknown): ChainTypes {
  const chainTypes = plainToClass(ChainTypes, raw);
  const errors = validateSync(chainTypes, {whitelist: true, forbidNonWhitelisted: true});
  if (errors?.length) {
    // TODO: print error details
    const errorMsgs = errors.map((e) => e.toString()).join('\n');
    throw new Error(`failed to parse chain types.\n${errorMsgs}`);
  }

  return chainTypes;
}
