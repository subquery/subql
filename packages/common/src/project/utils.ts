// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import path from 'path';
import {ValidatorConstraintInterface} from 'class-validator';
import detectPort from 'detect-port';
import {satisfies, valid} from 'semver';

export async function findAvailablePort(startPort: number, range = 10): Promise<number> {
  for (let port = startPort; port <= startPort + range; port++) {
    try {
      const _port = await detectPort(port);
      if (_port === port) {
        return port;
      }
    } catch (e) {
      return null;
    }
  }

  return null;
}

export interface ProjectRootAndManifest {
  root: string;
  manifest: string;
}

// --subquery -f pass in can be project.yaml or project.path,
// use this to determine its project root and manifest
export function getProjectRootAndManifest(subquery: string): ProjectRootAndManifest {
  const project = {} as ProjectRootAndManifest;
  const stats = fs.statSync(subquery);
  if (stats.isDirectory()) {
    project.root = subquery;
    project.manifest = path.resolve(subquery, 'project.yaml');
  } else if (stats.isFile()) {
    const {dir} = path.parse(subquery);
    project.root = dir;
    project.manifest = subquery;
  }
  project.root = path.resolve(project.root);
  return project;
}

export function validateSemver(current: string, required: string): boolean {
  // if (current !== 'latest' && current !== 'dev') {
  //   return false
  // }
  return satisfies(current, required, {includePrerelease: true});
}

export class SemverVersionValidator implements ValidatorConstraintInterface {
  validate(value: string | null | undefined): boolean {
    console.log(`semver value: ${value}`);

    const validated = valid(value, {includePrerelease: false});
    if (validated === null || validated === undefined) {
      return false;
    }
    return true;
  }
  defaultMessage(): string {
    // if (value.value !== 'latest'  && value.value !== 'dev') {
    //   return 'Version number must follow Semver rules';
    // }
    return '"latest" and "dev" are not valid versions';
  }
}

export async function delay(sec: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, sec * 1000);
  });
}
