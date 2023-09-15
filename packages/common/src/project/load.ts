// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'fs';
import path from 'path';
import {loadProjectFromScript} from '@subql/common';
import {ProjectManifestV1_0_0} from '@subql/types-core';
import yaml from 'js-yaml';
import {gte} from 'semver';
import {NETWORK_FAMILY, runnerMapping} from '../constants';
import {DEFAULT_MANIFEST, DEFAULT_TS_MANIFEST, extensionIsTs, extensionIsYamlOrJSON} from './utils';
export function loadFromJsonOrYaml(file: string): unknown {
  const {ext} = path.parse(file);
  if (!extensionIsYamlOrJSON(ext)) {
    throw new Error(`Extension ${ext} not supported`);
  }
  const rawContent = fs.readFileSync(file, 'utf-8');
  return yaml.load(rawContent);
}

export function getManifestPath(manifestDir: string, fileName?: string): string {
  let manifestPath = manifestDir;
  if (fs.existsSync(manifestDir) && fs.lstatSync(manifestDir).isDirectory()) {
    const tsFilePath = path.join(manifestDir, fileName ?? DEFAULT_TS_MANIFEST);
    const yamlFilePath = path.join(manifestDir, fileName ?? DEFAULT_MANIFEST);
    const jsonFilePath = path.join(manifestDir, fileName ?? 'project.json');
    if (fs.existsSync(tsFilePath)) {
      manifestPath = tsFilePath;
    } else if (fs.existsSync(yamlFilePath)) {
      manifestPath = yamlFilePath;
    } else if (fs.existsSync(jsonFilePath)) {
      manifestPath = jsonFilePath;
    } else {
      throw new Error(`Could not find project manifest under dir ${manifestDir}`);
    }
  }
  return manifestPath;
}

export function getSchemaPath(manifestDir: string, fileName?: string): string {
  let rawProject: unknown;
  const {ext} = path.parse(fileName);
  if (extensionIsTs(ext)) {
    rawProject = loadProjectFromScript(getManifestPath(manifestDir, fileName), path.resolve(manifestDir));
  } else {
    const rawProject = loadFromJsonOrYaml(getManifestPath(manifestDir, fileName));
    if ((rawProject as any).specVersion === '0.0.1') {
      return path.join(manifestDir, (rawProject as any).schema);
    }
  }
  const project = rawProject as ProjectManifestV1_0_0;
  if (!project.schema) {
    throw new Error(`Can't get schema in yaml file`);
  }
  if (!project.schema.file) {
    throw new Error(`schemaPath expect to be schema.file`);
  }
  return path.join(manifestDir, project.schema.file);
}

// Only work for manifest specVersion >= 1.0.0
export function getProjectNetwork(rawManifest: unknown): NETWORK_FAMILY {
  if (gte((rawManifest as any).specVersion, '1.0.0')) {
    const network = runnerMapping[(rawManifest as any).runner.node.name as keyof typeof runnerMapping];
    if (network === undefined) {
      throw new Error(`Can not identify project network with runner node ${(rawManifest as any).runner.node.name}`);
    }
    return network;
  } else {
    throw new Error('Can not identify project network under spec version 1.0.0');
  }
}

/**
 * @param path path to the file
 * @param identifier name to be used for logging purpose
 * @returns file content
 */
export function getFileContent(path: string, identifier: string): string {
  if (!fs.existsSync(path)) {
    const err_msg = `${identifier} file ${path} is does not exist`;
    throw new Error(err_msg);
  }

  try {
    return fs.readFileSync(path).toString();
  } catch (error) {
    const err_msg = `Failed to load ${identifier} file, ${error}`;
    throw new Error(err_msg);
  }
}
