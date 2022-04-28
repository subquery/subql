// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import path from 'path';
import {loadFromJsonOrYaml} from '@subql/common';
import {plainToClass} from 'class-transformer';
import {validateSync} from 'class-validator';
// import {NodeVM, VMScript} from 'vm2';
import {ChainTypes} from './models';
import {SubstrateProjectManifestVersioned, VersionedProjectManifest} from './versioned';

export function parseSubstrateProjectManifest(raw: unknown): SubstrateProjectManifestVersioned {
  const projectManifest = new SubstrateProjectManifestVersioned(raw as VersionedProjectManifest);
  projectManifest.validate();
  return projectManifest;
}

export function loadSubstrateProjectManifest(file: string): SubstrateProjectManifestVersioned {
  let manifestPath = file;
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

  const doc = loadFromJsonOrYaml(manifestPath);
  const projectManifest = new SubstrateProjectManifestVersioned(doc as VersionedProjectManifest);
  projectManifest.validate();
  return projectManifest;
}
export function parseChainTypes(raw: unknown): ChainTypes {
  const chainTypes = plainToClass(ChainTypes, raw);
  if (
    !!chainTypes.types ||
    !!chainTypes.typesChain ||
    !!chainTypes.typesBundle ||
    !!chainTypes.typesAlias ||
    !!chainTypes.typesSpec
  ) {
    const errors = validateSync(chainTypes, {whitelist: true, forbidNonWhitelisted: true});
    if (errors?.length) {
      // TODO: print error details
      const errorMsgs = errors.map((e) => e.toString()).join('\n');
      throw new Error(`failed to parse chain types.\n${errorMsgs}`);
    }
    return chainTypes;
  } else {
    throw new Error(`chainTypes is not valid`);
  }
}
