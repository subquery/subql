// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'node:fs';
import path from 'node:path';
import * as esbuild from 'esbuild';
import {globSync} from 'glob';
import * as yaml from 'js-yaml';

export async function runBundle(
  buildEntries: Record<string, string>,
  projectDir: string,
  outputDir: string,
  isDev = false,
  clean = false
): Promise<void> {
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, {recursive: true});
  } else if (clean) {
    // Simple clean implementation - could be enhanced for more selective cleaning
    const files = fs.readdirSync(outputDir);
    files.forEach((file) => {
      fs.rmSync(path.join(outputDir, file), {force: true, recursive: true});
    });
  }

  // Setup plugins for yaml support
  const yamlPlugin = {
    name: 'yaml',
    setup(build: esbuild.PluginBuild) {
      build.onLoad({filter: /\.ya?ml$/}, (args) => {
        const source = fs.readFileSync(args.path, 'utf8');
        const contents = `export default ${JSON.stringify(yaml.load(source))}`;
        return {contents, loader: 'js'};
      });
    },
  };

  // Build each entry point separately
  const buildPromises = Object.entries(buildEntries).map(async ([name, entry]) => {
    try {
      await esbuild.build({
        entryPoints: [entry],
        bundle: true,
        platform: 'node',
        outfile: path.join(outputDir, `${name}.js`),
        sourcemap: 'inline',
        minify: !isDev,
        treeShaking: true,
        format: 'cjs',
        plugins: [yamlPlugin],
        tsconfig: path.join(projectDir, 'tsconfig.json'),
        target: 'node22',
      });
    } catch (error) {
      throw new Error(`Error building ${name}: ${error}`);
    }
  });

  await Promise.all(buildPromises);
}

export function getBuildEntries(directory: string): Record<string, string> {
  // FIXME: this is an assumption that the default entry is src/index.ts, in reality it should read from the project manifest
  const defaultEntry = path.join(directory, 'src/index.ts');
  let buildEntries: Record<string, string> = {
    index: defaultEntry,
  };

  globSync(path.join(directory, 'src/test/**/*.test.ts')).forEach((testFile) => {
    const testName = path.basename(testFile).replace('.ts', '');
    buildEntries[`test/${testName}`] = testFile;
  });

  globSync(path.join(directory, 'src/tests/**/*.test.ts')).forEach((testFile) => {
    const testName = path.basename(testFile).replace('.ts', '');
    buildEntries[`tests/${testName}`] = testFile;
  });

  // Get the output location from the project package.json main field
  const pjson = JSON.parse(fs.readFileSync(path.join(directory, 'package.json')).toString());
  if (pjson.exports && typeof pjson.exports !== 'string') {
    buildEntries = Object.entries(pjson.exports as Record<string, string>).reduce(
      (acc, [key, value]) => {
        acc[key] = path.resolve(directory, value);
        return acc;
      },
      {...buildEntries}
    );
  }

  for (const i in buildEntries) {
    if (typeof buildEntries[i] !== 'string') {
      console.warn(`Ignoring entry ${i} from build.`);
      delete buildEntries[i];
    }
  }

  return buildEntries;
}
