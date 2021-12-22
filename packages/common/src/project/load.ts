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

export function loadFromFile(filePath: string, requireRoot?: string) {
  const {base, ext} = path.parse(filePath);
  const root = requireRoot ?? path.dirname(filePath);
  if (ext === '.js' || ext === '.cjs') {
    const vm = new NodeVM({
      console: 'redirect',
      wasm: false,
      sandbox: {},
      require: {
        context: 'sandbox',
        external: true,
        builtin: ['path'],
        root: root,
        resolve: (moduleName: string) => {
          return require.resolve(moduleName, {paths: [root]});
        },
      },
      wrapper: 'commonjs',
      sourceExtensions: ['js', 'cjs'],
    });

    let rawContent: unknown;
    try {
      const script = new VMScript(
        `module.exports = require('${filePath}').default;`,
        path.join(root, 'sandbox')
      ).compile();
      rawContent = vm.run(script) as unknown;
    } catch (err) {
      throw new Error(`\n NodeVM error: ${err}`);
    }
    if (rawContent === undefined) {
      throw new Error(`There was no default export found from required ${base} file`);
    }
    return rawContent;
  } else if (ext === '.yaml' || ext === '.yml' || ext === '.json') {
    const rawContent = fs.readFileSync(filePath, 'utf-8');
    return yaml.load(rawContent);
  } else {
    throw new Error(`Extension ${ext} not supported`);
  }
}

export function loadChainTypes(file: string, projectRoot: string) {
  const {ext} = path.parse(file);
  if (ext !== '.yaml' && ext !== '.yml' && ext !== '.json' && ext !== '.js') {
    throw new Error(`Chain types not support extension ${ext}`);
  }
  return loadFromFile(file, projectRoot);
}

export function loadProjectManifest(file: string): ProjectManifestVersioned {
  let manifestPath: string;
  if (fs.existsSync(file) && fs.lstatSync(file).isDirectory()) {
    const yamlFilePath = path.join(file, 'project.yaml');
    const jsonFilePath = path.join(file, 'project.json');
    if (fs.existsSync(yamlFilePath)) {
      manifestPath = yamlFilePath;
    } else if (fs.existsSync(jsonFilePath)) {
      manifestPath = jsonFilePath;
    } else {
      throw new Error(`Could not find project manifest under dir ${file}`);
    }
  }
  const doc = loadFromFile(manifestPath);
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
