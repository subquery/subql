// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import path from 'path';
import {plainToClass} from 'class-transformer';
import {validateSync, ValidationError} from 'class-validator';
import yaml from 'js-yaml';
import {ProjectManifestImpl} from './models';
import {ProjectManifest} from './types';

export function plainToProjectManifest(doc: unknown): ProjectManifestImpl {
  return plainToClass(ProjectManifestImpl, doc);
}

export function validateProjectManifest(manifest: ProjectManifestImpl): ValidationError[] {
  const errors = validateSync(manifest, {whitelist: true, forbidNonWhitelisted: true});

  return errors;
}

export function loadProjectManifest(file: string): ProjectManifest {
  let filePath = file;
  if (fs.existsSync(file) && fs.lstatSync(file).isDirectory()) {
    filePath = path.join(file, 'project.yaml');
  }

  const doc = yaml.load(fs.readFileSync(filePath, 'utf-8'));

  const manifest = plainToProjectManifest(doc);
  const errors = validateProjectManifest(manifest);
  if (errors?.length) {
    // TODO: print error details
    const errorMsgs = errors.map((e) => e.toString()).join('\n');
    throw new Error(`failed to parse project.yaml.\n${errorMsgs}`);
  }
  return manifest;
}
