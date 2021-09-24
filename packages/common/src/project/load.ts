// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import path from 'path';
import {plainToClass} from 'class-transformer';
import {validateSync} from 'class-validator';
import yaml from 'js-yaml';
import parseJson from 'parse-json';
import {ChainTypes} from './models';
import {ProjectManifestVersioned, VersionedProjectManifest} from './versioned';

export function loadFromJsonOrYaml(file: string): unknown {
  const fileInfo = path.parse(file);

  const rawContent = fs.readFileSync(file, 'utf-8');

  if (fileInfo.ext === '.json') {
    return parseJson(rawContent, file);
  } else if (fileInfo.ext === '.yaml' || fileInfo.ext === '.yml') {
    return yaml.load(rawContent);
  } else {
    throw new Error(`Extension ${fileInfo.ext} not supported`);
  }
}

function loadFromFile(file: string): unknown {
  let filePath = file;
  if (fs.existsSync(file) && fs.lstatSync(file).isDirectory()) {
    filePath = path.join(file, 'project.yaml');
  }

  return loadFromJsonOrYaml(filePath);
}

export function loadProjectManifest(file: string): ProjectManifestVersioned {
  const doc = loadFromFile(file);
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
