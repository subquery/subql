// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import os from 'os';
import path from 'path';
import {validateSync, ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface} from 'class-validator';
import detectPort from 'detect-port';
import * as yaml from 'js-yaml';
import Pino from 'pino';
import {prerelease, satisfies, valid, validRange} from 'semver';
import {RUNNER_ERROR_REGEX} from '../constants';
import {ProjectManifestParentV1_0_0} from './versioned';

// Input manifest here, we might need to handler other error later on
export function handleCreateSubqueryProjectError(err: Error, pjson: any, rawManifest: any, logger: Pino.Logger) {
  if (JSON.stringify(err.message).includes(RUNNER_ERROR_REGEX)) {
    logger.error(`Failed to init project, required runner is ${rawManifest.runner.node.name}, got ${pjson.name}`);
  } else {
    logger.error(err, 'Create Subquery project from given path failed!');
  }
}

export async function makeTempDir(): Promise<string> {
  const sep = path.sep;
  const tmpDir = os.tmpdir();
  const tempPath = await fs.promises.mkdtemp(`${tmpDir}${sep}`);
  return tempPath;
}

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
  manifests: string[];
}

export function getProjectRootAndManifest(subquery: string): ProjectRootAndManifest {
  const project: ProjectRootAndManifest = {
    root: '',
    manifests: [],
  };

  const stats = fs.statSync(subquery);

  if (stats.isDirectory()) {
    project.root = subquery;

    // Check for 'project.yaml' first
    if (fs.existsSync(path.resolve(subquery, 'project.yaml'))) {
      project.manifests.push(path.resolve(subquery, 'project.yaml'));
    }
    // Then check for a 'multichain manifest'
    else if (fs.existsSync(path.resolve(subquery, 'subquery-multichain.yaml'))) {
      const multichainManifestContent: ProjectManifestParentV1_0_0 = yaml.load(
        fs.readFileSync(path.resolve(subquery, 'subquery-multichain.yaml'), 'utf8')
      ) as ProjectManifestParentV1_0_0;

      if (!multichainManifestContent.projects || !Array.isArray(multichainManifestContent.projects)) {
        throw new Error('Multichain manifest does not contain a valid "projects" field');
      }

      addMultichainManifestProjects(subquery, multichainManifestContent, project);
    } else {
      throw new Error(`Unable to resolve manifest file from given directory: ${subquery}`);
    }
  } else if (stats.isFile()) {
    const {dir} = path.parse(subquery);
    project.root = dir;
    const multichainManifestContent = yaml.load(fs.readFileSync(subquery, 'utf8')) as ProjectManifestParentV1_0_0;
    if (multichainManifestContent.projects && Array.isArray(multichainManifestContent.projects)) {
      addMultichainManifestProjects(dir, multichainManifestContent, project);
    } else {
      project.manifests.push(subquery);
    }
  }

  project.root = path.resolve(project.root);

  // Convert manifest paths to be relative to the project root
  project.manifests = project.manifests.map((manifestPath) => {
    return path.relative(project.root, manifestPath);
  });

  return project;
}

function addMultichainManifestProjects(
  parentDir: string,
  multichainManifestContent: any,
  project: ProjectRootAndManifest
) {
  for (const projectPath of multichainManifestContent.projects) {
    if (fs.existsSync(path.resolve(parentDir, projectPath))) {
      project.manifests.push(path.resolve(parentDir, projectPath));
    }
  }

  if (project.manifests.length === 0) {
    throw new Error('None of the project files specified in the multichain manifest could be found');
  }
}

export function validateSemver(current: string, required: string): boolean {
  return satisfies(current, required, {includePrerelease: true});
}

@ValidatorConstraint({name: 'semver', async: false})
export class SemverVersionValidator implements ValidatorConstraintInterface {
  validate(value: string | null | undefined): boolean {
    if (valid(value) === null) {
      return validRange(value, {includePrerelease: false}) !== null;
    } else {
      return prerelease(value) === null;
    }
  }
  defaultMessage(args: ValidationArguments): string {
    return `'${args.value}' is not a valid version. Please provide a valid semver`;
  }
}

export async function delay(sec: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, sec * 1000);
  });
}

export function validateObject(object: any, errorMessage = 'failed to validate object.'): void {
  const errors = validateSync(object, {whitelist: true, forbidNonWhitelisted: true});
  if (errors?.length) {
    const errorMsgs = errors.map((e) => e.toString()).join('\n');
    throw new Error(`${errorMessage}\n${errorMsgs}`);
  }
}
