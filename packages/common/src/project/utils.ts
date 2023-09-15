// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'fs';
import os from 'os';
import path from 'path';
import {FileReference, MultichainProjectManifest, ProjectRootAndManifest} from '@subql/types-core';
import {
  registerDecorator,
  validateSync,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import detectPort from 'detect-port';
import * as yaml from 'js-yaml';
import Pino from 'pino';
import {lt, prerelease, satisfies, valid, validRange} from 'semver';
import updateNotifier, {Package} from 'update-notifier';
import {RUNNER_ERROR_REGEX} from '../constants';

export const DEFAULT_MULTICHAIN_MANIFEST = 'subquery-multichain.yaml';
export const DEFAULT_MANIFEST = 'project.yaml';
export const DEFAULT_TS_MANIFEST = 'project.ts';
export const DEFAULT_PKG = 'package.json';

export function isFileReference(value: any): value is FileReference {
  return value?.file && typeof value.file === 'string';
}

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

export function getProjectRootAndManifest(subquery: string): ProjectRootAndManifest {
  const project: ProjectRootAndManifest = {
    root: '',
    manifests: [],
  };

  const stats = fs.statSync(subquery);

  if (stats.isDirectory()) {
    project.root = subquery;

    // Check for 'project.ts' first , then 'project.yaml'
    if (fs.existsSync(path.resolve(subquery, DEFAULT_TS_MANIFEST))) {
      project.manifests.push(path.resolve(subquery, DEFAULT_TS_MANIFEST));
    } else if (fs.existsSync(path.resolve(subquery, DEFAULT_MANIFEST))) {
      project.manifests.push(path.resolve(subquery, DEFAULT_MANIFEST));
    }
    // Then check for a 'multichain manifest'
    else if (fs.existsSync(path.resolve(subquery, DEFAULT_MULTICHAIN_MANIFEST))) {
      const multichainManifestContent: MultichainProjectManifest = yaml.load(
        fs.readFileSync(path.resolve(subquery, DEFAULT_MULTICHAIN_MANIFEST), 'utf8')
      ) as MultichainProjectManifest;

      if (!multichainManifestContent.projects || !Array.isArray(multichainManifestContent.projects)) {
        throw new Error('Multichain manifest does not contain a valid "projects" field');
      }

      addMultichainManifestProjects(subquery, multichainManifestContent, project);
    } else {
      throw new Error(`Unable to resolve manifest file from given directory: ${subquery}`);
    }
  } else if (stats.isFile()) {
    const {dir, ext} = path.parse(subquery);
    if (!extensionIsTs(ext) && !extensionIsYamlOrJSON(ext)) {
      throw new Error(`Extension ${ext} not supported for project ${subquery}`);
    }
    project.root = dir;
    if (extensionIsTs(ext)) {
      project.manifests.push(subquery);
    } else {
      const multichainManifestContent = yaml.load(fs.readFileSync(subquery, 'utf8')) as MultichainProjectManifest;
      if (multichainManifestContent.projects && Array.isArray(multichainManifestContent.projects)) {
        addMultichainManifestProjects(dir, multichainManifestContent, project);
      } else {
        project.manifests.push(subquery);
      }
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
    const {ext} = path.parse(projectPath);
    if (!extensionIsYamlOrJSON(ext)) {
      throw new Error(`Extension ${ext} not supported for project ${projectPath}`);
    }

    if (fs.existsSync(path.resolve(parentDir, projectPath))) {
      project.manifests.push(path.resolve(parentDir, projectPath));
    } else {
      throw new Error(`Project ${projectPath} not found`);
    }
  }

  if (project.manifests.length === 0) {
    throw new Error('None of the project files specified in the multichain manifest could be found');
  }
}

export function getMultichainManifestPath(subquery: string): string | undefined {
  const stats = fs.statSync(subquery);
  let multichainManifestPath: string | undefined;
  let projectRoot: string | undefined;

  if (stats.isDirectory()) {
    projectRoot = subquery;
    const multichainManifestCandidate = path.resolve(subquery, DEFAULT_MULTICHAIN_MANIFEST);
    if (fs.existsSync(multichainManifestCandidate)) {
      multichainManifestPath = multichainManifestCandidate;
    }
  } else if (stats.isFile()) {
    const {dir, ext} = path.parse(subquery);
    projectRoot = dir;
    if (extensionIsYamlOrJSON(ext)) {
      const multichainManifestContent = yaml.load(fs.readFileSync(subquery, 'utf8')) as MultichainProjectManifest;
      if (multichainManifestContent.projects && Array.isArray(multichainManifestContent.projects)) {
        multichainManifestPath = path.resolve(dir, subquery);
      }
    }
  }

  if (multichainManifestPath && projectRoot) {
    return path.relative(projectRoot, multichainManifestPath);
  }

  return undefined;
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

export function extensionIsTs(ext: string): boolean {
  return ext === '.ts';
}

export function extensionIsYamlOrJSON(ext: string): boolean {
  return ext === '.yaml' || ext === '.yml' || ext === '.json';
}

export function forbidNonWhitelisted(keys: any, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'forbidNonWhitelisted',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const isValid = !Object.keys(value).some((key) => !(key in keys));
          if (!isValid) {
            throw new Error(
              `Invalid keys present in value: ${JSON.stringify(value)}. Whitelisted keys: ${JSON.stringify(
                Object.keys(keys)
              )}`
            );
          }
          return isValid;
        },
      },
    });
  };
}

export function notifyUpdates(pjson: Package, logger: Pino.Logger): void {
  const notifier = updateNotifier({pkg: pjson, updateCheckInterval: 0});

  const latestVersion = notifier.update ? notifier.update.latest : pjson.version;

  if (notifier.update && lt(pjson.version, latestVersion)) {
    logger.info(`Update available: ${pjson.version} → ${latestVersion}`);
  } else {
    logger.info(`Current ${pjson.name} version is ${pjson.version}`);
  }
}

@ValidatorConstraint({name: 'isFileReference', async: false})
export class FileReferenceImp<T> implements ValidatorConstraintInterface {
  validate(value: Map<string, T>): boolean {
    if (!value) {
      return false;
    }
    return !!Object.values(value).find((fileReference: T) => this.isValidFileReference(fileReference));
  }
  defaultMessage(args: ValidationArguments): string {
    return `${JSON.stringify(args.value)} is not a valid assets format`;
  }

  private isValidFileReference(fileReference: T): boolean {
    return typeof fileReference === 'object' && 'file' in fileReference && typeof fileReference.file === 'string';
  }
}
