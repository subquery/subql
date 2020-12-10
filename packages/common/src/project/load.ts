import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import {plainToClass} from 'class-transformer';
import {validateSync} from 'class-validator';
import {ProjectManifestImpl} from './models';
import {ProjectManifest} from './types';

export function loadProjectManifest(file: string): ProjectManifest {
  let filePath = file;
  if (fs.existsSync(file) && fs.lstatSync(file).isDirectory()) {
    filePath = path.join(file, 'project.yaml');
  }

  const doc = yaml.safeLoad(fs.readFileSync(filePath, 'utf-8'));

  const manifest = plainToClass(ProjectManifestImpl, doc);
  const errors = validateSync(manifest);
  if (errors?.length) {
    // TODO: print error details
    throw new Error('failed to parse project.yaml');
  }
  return manifest;
}
