// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import {gte} from 'semver';
import {NETWORK_FAMILY, runnerMapping} from '../constants';
import {ProjectManifestV0_2_0} from '../project/versioned';
export function loadFromJsonOrYaml(file: string): unknown {
  const {ext} = path.parse(file);
  if (ext !== '.yaml' && ext !== '.yml' && ext !== '.json') {
    throw new Error(`Extension ${ext} not supported`);
  }
  const rawContent = fs.readFileSync(file, 'utf-8');
  return yaml.load(rawContent);
}

export function getManifestPath(file: string): string {
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
  return manifestPath;
}

export function getSchemaPath(file: string) {
  const yamlFile = loadFromJsonOrYaml(getManifestPath(file));
  if ((yamlFile as any).specVersion === '0.0.1') {
    return path.join(file, (yamlFile as any).schema);
  }
  const project = yamlFile as ProjectManifestV0_2_0;
  if (!project.schema) {
    throw new Error(`Can't get schema in yaml file`);
  }
  if (!project.schema.file) {
    throw new Error(`schemaPath expect to be schema.file`);
  }
  return path.join(file, project.schema.file);
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
