// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export function loadFromJsonOrYaml(file: string): unknown {
  const {ext} = path.parse(file);
  if (ext !== '.yaml' && ext !== '.yml' && ext !== '.json') {
    throw new Error(`Extension ${ext} not supported`);
  }
  const rawContent = fs.readFileSync(file, 'utf-8');
  return yaml.load(rawContent);
}
