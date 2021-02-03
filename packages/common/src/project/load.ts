// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import path from 'path';
import {plainToClass} from 'class-transformer';
import {validateSync} from 'class-validator';
import yaml from 'js-yaml';
import {ProjectManifestImpl} from './models';
import {ProjectManifest} from './types';

export function loadProjectManifest(file: string): ProjectManifest {
  let filePath = file;
  if (fs.existsSync(file) && fs.lstatSync(file).isDirectory()) {
    filePath = path.join(file, 'project.yaml');
  }

  const doc = yaml.safeLoad(fs.readFileSync(filePath, 'utf-8'));

  const manifest = plainToClass(ProjectManifestImpl, doc);
  const errors = validateSync(manifest, {whitelist: true, forbidNonWhitelisted: true});
  if (errors?.length) {
    // TODO: print error details
    try {
      const errorMsgs = errors.map((e) => e.toString()).join('\n');
      throw new Error(`failed to parse project.yaml.\n${errorMsgs}`);
    } catch (e) {
      throw new Error(`failed to parse project.yaml.`);
    }
  }
  return manifest;
}
