import * as fs from 'fs';
import yaml from 'js-yaml';
import {plainToClass} from 'class-transformer';
import {validateSync} from 'class-validator';
import {ProjectManifestImpl} from './models';

export function loadProjectManifest(file: string) {
  const doc = yaml.safeLoad(fs.readFileSync(file, 'utf-8'));

  const manifest = plainToClass(ProjectManifestImpl, doc);
  const errors = validateSync(manifest);
  if (errors?.length) {
    // TODO: print error details
    throw new Error('failed to parse project.yaml');
  }
  return manifest;
}
