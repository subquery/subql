// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import path from 'path';
import {ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface} from 'class-validator';
import detectPort from 'detect-port';
import {prerelease, satisfies, valid, validRange,gte} from 'semver';
import {GenericNetworkImp, ProjectManifestImp} from './versioned/genericManifest';

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
    if (valid(value, {includePrerelease: false}) === null) {
      return validRange(value, {includePrerelease: false}) !== null;
    } else {
      return prerelease(value) === null;
    }
  }
  defaultMessage(args: ValidationArguments): string {
    return `'${args.value}' is not a valid version. Please provide a valid semver`;
  }
}

@ValidatorConstraint()
export class NetworkValidator implements ValidatorConstraintInterface {
  private errMessage: string;
  validate(network: GenericNetworkImp, args: ValidationArguments): boolean {
    const specVersion = (args.object as ProjectManifestImp).specVersion;

    if (gte(specVersion, '1.0.0')) {
      if (!network.chainId) {
        this.errMessage = 'for manifest 1.0.0 or newer, chainId must be defined';
        return false;
      }
    } else {
      if (!network.genesisHash) {
        this.errMessage = 'manifest genesisHash must be defined';
        return false;
      }
    }
    return true;
  }
  defaultMessage(): string {
    return `Network validation failed, ${this.errMessage}`;
  }
}

export async function delay(sec: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, sec * 1000);
  });
}
