// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import path from 'path';
import {ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface} from 'class-validator';
import detectPort from 'detect-port';
import {prerelease, satisfies, validRange} from 'semver';

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
  return satisfies(current, required, {includePrerelease: true});
}

@ValidatorConstraint({name: 'semver', async: false})
export class SemverVersionValidator implements ValidatorConstraintInterface {
  validate(value: string | null | undefined): boolean {
    const validated = validRange(value, {includePrerelease: false});
    // console.log(validated)
    if (validated) {
      const prereleaseCheck = prerelease(value);
      if (prereleaseCheck === null || prereleaseCheck === undefined) {
        return true;
      }
      return false;
    }
    return false;

    // if (validated === null || validated === undefined) {
    //   return false;
    // } else {
    //   const checkPrerelease = prerelease(value)
    //   console.log(checkPrerelease);
    //   return checkPrerelease === null || checkPrerelease === undefined;
    // }
    // if validRange gives a value
    // then check prerelease
    // if it returns a value
    // returns false

    // console.log(validated);
    // if (validated !== null) {
    //   const checkPrerelease = prerelease(value)
    //   console.log(checkPrerelease)
    //     if ( checkPrerelease !== null) {
    //       return false;
    //     }
    //     return true;
    // }
    // return false
  }
  defaultMessage(args: ValidationArguments): string {
    return `'${args.value}' is not valid version`;
  }
}

export async function delay(sec: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, sec * 1000);
  });
}
