// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import path from 'path';
import {plainToClass} from 'class-transformer';
import {validateSync} from 'class-validator';
import yaml from 'js-yaml';
import {ProjectManifestV0_0_1Impl, ProjectManifestV0_0_2Impl} from './models';
import {SpecVersion, ProjectManifestBase, ProjectManifestV0_0_1, ProjectManifestV0_0_2} from './types';

type ProjectManifest<V extends SpecVersion> = V extends '0.0.1'
  ? ProjectManifestV0_0_1
  : V extends '0.0.2'
  ? ProjectManifestV0_0_2
  : ProjectManifestBase;

type VersionImpl<V extends SpecVersion> = Record<V, (doc: unknown) => ProjectManifest<V>>;

const plainToProjectManifestImpl: VersionImpl<SpecVersion> = {
  '0.0.1': (doc: unknown) => plainToClass(ProjectManifestV0_0_1Impl, doc),
  '0.0.2': (doc: unknown) => plainToClass(ProjectManifestV0_0_2Impl, doc),
};

function loadFromFile(file: string): unknown {
  let filePath = file;
  if (fs.existsSync(file) && fs.lstatSync(file).isDirectory()) {
    filePath = path.join(file, 'project.yaml');
  }

  return yaml.load(fs.readFileSync(filePath, 'utf-8'));
}

export function validateProjectManifest<SV extends Array<SpecVersion>>(
  doc: unknown,
  supportedVersions: SV
): ProjectManifest<SV[number]> {
  const specVersion = (doc as ProjectManifestBase).specVersion;

  if (!supportedVersions.includes(specVersion as SpecVersion) && !!plainToProjectManifestImpl[specVersion]) {
    throw new Error(`Unsupported specVersion: ${specVersion}`);
  }

  const manifest = plainToProjectManifestImpl[specVersion](doc);

  const errors = validateSync(manifest, {whitelist: true, forbidNonWhitelisted: true});
  if (errors?.length) {
    // TODO: print error details
    const errorMsgs = errors.map((e) => e.toString()).join('\n');
    throw new Error(`failed to parse project.yaml.\n${errorMsgs}`);
  }
  return manifest;
}

export function loadProjectManifest<SV extends Array<SpecVersion>>(
  file: string,
  supportedVersions: SV
): ProjectManifest<SV[number]> {
  const doc = loadFromFile(file);

  return validateProjectManifest(doc, supportedVersions);
}
