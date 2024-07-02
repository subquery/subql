// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import {existsSync, lstatSync, readFileSync, writeFileSync} from 'fs';
import path from 'path';
import {
  DEFAULT_MULTICHAIN_MANIFEST,
  DEFAULT_MULTICHAIN_TS_MANIFEST,
  DEFAULT_TS_MANIFEST,
  tsProjectYamlPath,
} from '@subql/common';
import {MultichainProjectManifest} from '@subql/types-core';
import * as yaml from 'js-yaml';
import * as tsNode from 'ts-node';

const requireScriptWrapper = (scriptPath: string, outputPath: string): string =>
  `import {toJsonObject} from '@subql/common';` +
  `const {writeFileSync} = require('fs');` +
  `const yaml = require('js-yaml');` +
  `const project = toJsonObject((require('${scriptPath}')).default);` +
  `const yamlOutput = yaml.dump(project);` +
  `writeFileSync('${outputPath}', '# // Auto-generated , DO NOT EDIT\\n' + yamlOutput);`;

// Replaces \ in path on windows that don't work with require
function formatPath(p: string): string {
  return p.replace(/\\/g, '/');
}

export async function buildManifestFromLocation(location: string, log: (...args: any[]) => void): Promise<string> {
  let directory: string;
  let projectManifestEntry: string;
  // lstatSync will throw if location not exist
  if (lstatSync(location).isDirectory()) {
    directory = location;
    projectManifestEntry = path.join(directory, DEFAULT_TS_MANIFEST);
  } else if (lstatSync(location).isFile()) {
    directory = path.dirname(location);
    projectManifestEntry = location;
  } else {
    throw new Error('Argument `location` is not a valid directory or file');
  }

  // We compile from TypeScript every time, even if the current YAML file exists, to ensure that the YAML file remains up-to-date with the latest changes
  try {
    //we could have a multichain yaml with ts projects inside it
    const projectYamlPath = projectManifestEntry.endsWith('.ts')
      ? await generateManifestFromTs(projectManifestEntry, log)
      : projectManifestEntry;

    if (isMultichain(projectYamlPath)) {
      const tsManifests = getTsManifestsFromMultichain(projectYamlPath);
      await Promise.all(tsManifests.map((manifest) => generateManifestFromTs(manifest, log)));
      replaceTsReferencesInMultichain(projectYamlPath);
    }
  } catch (e: any) {
    console.log(e);
    throw new Error(`Failed to generate manifest from typescript ${projectManifestEntry}, ${e.message}`);
  }
  return directory;
}

// eslint-disable-next-line @typescript-eslint/require-await
export async function generateManifestFromTs(
  projectManifestEntry: string,
  log: (...args: any[]) => void
): Promise<string> {
  assert(existsSync(projectManifestEntry), `${projectManifestEntry} does not exist`);
  const projectYamlPath = tsProjectYamlPath(projectManifestEntry);
  try {
    // Allows requiring TS, this allows requirng the projectManifestEntry ts file
    const tsNodeService = tsNode.register({transpileOnly: true});

    // Compile the above script
    const script = tsNodeService.compile(
      requireScriptWrapper(formatPath(projectManifestEntry), formatPath(projectYamlPath)),
      'inline.ts'
    );

    // Run compiled code
    eval(script);

    log(`Project manifest generated to ${projectYamlPath}`);

    return projectYamlPath;
  } catch (error) {
    throw new Error(`Failed to build ${projectManifestEntry}: ${error}`);
  }
}

//Returns either the single chain ts manifest or the multichain ts/yaml manifest
export function getTsManifest(location: string): string | null {
  let manifest: string;

  if (lstatSync(location).isDirectory()) {
    //default ts manifest
    manifest = path.join(location, DEFAULT_TS_MANIFEST);
    if (existsSync(manifest)) {
      return manifest;
    } else {
      //default multichain ts manifest
      manifest = path.join(location, DEFAULT_MULTICHAIN_TS_MANIFEST);
      if (existsSync(manifest)) {
        return manifest;
      } else {
        //default yaml multichain manifest
        manifest = path.join(location, DEFAULT_MULTICHAIN_MANIFEST);
        if (existsSync(manifest)) {
          return manifest;
        }
      }
    }
  } else if (lstatSync(location).isFile()) {
    if (location.endsWith('.ts') || isMultichain(location)) {
      return location;
    }
  }

  return null;
}

function getTsManifestsFromMultichain(location: string): string[] {
  const multichainContent = yaml.load(readFileSync(location, 'utf8')) as MultichainProjectManifest;

  if (!multichainContent || !multichainContent.projects) {
    return [];
  }

  return multichainContent.projects
    .filter((project) => project.endsWith('.ts'))
    .map((project) => path.resolve(path.dirname(location), project));
}

function isMultichain(location: string): boolean {
  const multichainContent = yaml.load(readFileSync(location, 'utf8')) as MultichainProjectManifest;

  return !!multichainContent && !!multichainContent.projects;
}

function replaceTsReferencesInMultichain(location: string): void {
  const multichainContent = yaml.load(readFileSync(location, 'utf8')) as MultichainProjectManifest;
  multichainContent.projects = multichainContent.projects.map((project) => tsProjectYamlPath(project));
  const yamlOutput = yaml.dump(multichainContent);
  writeFileSync(location, yamlOutput);
}
