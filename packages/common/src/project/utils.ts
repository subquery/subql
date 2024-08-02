// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  BaseDataSource,
  FileReference,
  IEndpointConfig,
  MultichainProjectManifest,
  ProjectRootAndManifest,
} from '@subql/types-core';
import {ClassConstructor, plainToInstance} from 'class-transformer';
import {
  registerDecorator,
  validateSync,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import * as yaml from 'js-yaml';
import Pino from 'pino';
import {lt, prerelease, satisfies, valid, validRange} from 'semver';
import updateNotifier, {Package} from 'update-notifier';
import {RUNNER_ERROR_REGEX} from '../constants';
import {CommonEndpointConfig} from './versioned';

export const DEFAULT_MULTICHAIN_MANIFEST = 'subquery-multichain.yaml';
export const DEFAULT_MULTICHAIN_TS_MANIFEST = 'subquery-multichain.ts';
export const DEFAULT_MANIFEST = 'project.yaml';
export const DEFAULT_TS_MANIFEST = 'project.ts';
export const DEFAULT_ENV = '.env';
export const DEFAULT_ENV_DEVELOP = '.env.develop';
export const DEFAULT_ENV_LOCAL = '.env.local';
export const DEFAULT_ENV_DEVELOP_LOCAL = '.env.develop.local';
export const DEFAULT_GIT_IGNORE = '.gitignore';

export function isFileReference(value: any): value is FileReference {
  return value?.file && typeof value.file === 'string';
}

// Input manifest here, we might need to handler other error later on
export function handleCreateSubqueryProjectError(err: Error, pjson: any, rawManifest: any, logger: Pino.Logger): void {
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

export function getProjectRootAndManifest(subquery: string): ProjectRootAndManifest {
  const project: ProjectRootAndManifest = {
    root: '',
    manifests: [],
  };

  const stats = fs.statSync(subquery);

  if (stats.isDirectory()) {
    project.root = subquery;

    if (fs.existsSync(path.resolve(subquery, DEFAULT_MANIFEST))) {
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
    let projectYamlPath = subquery;

    if (extensionIsTs(ext)) {
      projectYamlPath = tsProjectYamlPath(subquery);
      if (!fs.existsSync(projectYamlPath)) {
        throw new Error(
          `Could not find manifest ${projectYamlPath}, if pointing to a typescript manifest, please ensure build successfully`
        );
      }
    }

    const multichainManifestContent = yaml.load(fs.readFileSync(projectYamlPath, 'utf8')) as MultichainProjectManifest;
    // The project manifest could be empty
    if (multichainManifestContent === null) {
      throw new Error(`Read manifest content is null, ${projectYamlPath}`);
    } else if (multichainManifestContent.projects && Array.isArray(multichainManifestContent.projects)) {
      addMultichainManifestProjects(dir, multichainManifestContent, project);
    } else {
      project.manifests.push(projectYamlPath);
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
      return prerelease(value || '') === null;
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
  return function (object: object, propertyName: string): void {
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

export function IsNetworkEndpoint<T extends object>(cls: ClassConstructor<T>, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: 'IsNetworkEndpoint',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [],
      options: {message: 'Invalid network endpoint'},
      validator: {
        validate(value: string | string[] | Record<string, CommonEndpointConfig>, args: ValidationArguments) {
          if (typeof value === 'string') {
            return true;
          }
          if (Array.isArray(value)) {
            return value.every((v) => typeof v === 'string');
          }
          if (typeof value === 'object') {
            return (
              Object.keys(value).every((v) => typeof v === 'string') &&
              Object.values(value).every((v) => {
                const instance = plainToInstance(cls, v);
                const errors = validateSync(instance);
                return errors === undefined || !errors.length;
              })
            );
          }
          return false;
        },
      },
    });
  };
}

// Overload the function so that if input is undefineable then output is undefineable
export function normalizeNetworkEndpoints<T extends IEndpointConfig = IEndpointConfig>(
  input: string | string[] | Record<string, T>,
  defaultConfig?: T
): Record<string, T>;
export function normalizeNetworkEndpoints<T extends IEndpointConfig = IEndpointConfig>(
  input: string | string[] | Record<string, T> | undefined,
  defaultConfig: T
): Record<string, T> | undefined {
  if (typeof input === 'string') {
    return {[input]: defaultConfig ?? {}};
  } else if (Array.isArray(input)) {
    return input.reduce((acc, endpoint) => {
      acc[endpoint] = defaultConfig ?? {};
      return acc;
    }, {} as Record<string, T>);
  }

  for (const key in input) {
    // Yaml can make this null so we ensure it exists
    input[key] = input[key] ?? {};
  }
  return input;
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

export function toJsonObject(object: unknown): unknown {
  // When using plainToInstance or plainToClass, Map types will need to be converted to a JSON object
  // https://github.com/typestack/class-transformer/issues/1256#issuecomment-1175153352
  return JSON.parse(
    JSON.stringify(object, (_, value: unknown) => {
      if (value instanceof Map) {
        return mapToObject(value);
      }
      return value;
    })
  );
}

export function mapToObject(map: Map<string | number, unknown>): Record<string | number, unknown> {
  // XXX can use Object.entries with newer versions of node.js
  const assetsObj: Record<string, unknown> = {};
  for (const key of map.keys()) {
    assetsObj[key] = map.get(key);
  }
  return assetsObj;
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
    return (
      fileReference &&
      typeof fileReference === 'object' &&
      'file' in fileReference &&
      typeof fileReference.file === 'string'
    );
  }
}

export const tsProjectYamlPath = (tsManifestEntry: string) => tsManifestEntry.replace('.ts', '.yaml');

@ValidatorConstraint({async: false})
export class IsEndBlockGreater implements ValidatorConstraintInterface {
  validate(endBlock: number, args: ValidationArguments) {
    const object = args.object as BaseDataSource;
    return object.startBlock !== undefined && object.endBlock !== undefined
      ? object.endBlock >= object.startBlock
      : true;
  }

  defaultMessage(args: ValidationArguments) {
    return 'End block must be greater than or equal to start block';
  }
}
