// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'node:fs';
import path from 'node:path';
import * as esbuild from 'esbuild';
import {globSync} from 'glob';
import * as yaml from 'js-yaml';
import ts from 'typescript';

// Run TypeScript type checking
function runTypeCheck(projectDir: string): void {
  const tsconfigPath = path.join(projectDir, 'tsconfig.json');
  if (!fs.existsSync(tsconfigPath)) {
    throw new Error(`TypeScript configuration file not found: ${tsconfigPath}`);
  }

  // Parse the tsconfig.json file
  const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
  if (configFile.error) {
    throw new Error(
      `Error reading tsconfig.json: ${ts.formatDiagnostic(configFile.error, {
        getCanonicalFileName: (fileName) => fileName,
        getNewLine: () => ts.sys.newLine,
        getCurrentDirectory: () => ts.sys.getCurrentDirectory(),
      })}`
    );
  }

  // Parse the config options and modify them
  const config = {...configFile.config};
  if (!config.compilerOptions) {
    config.compilerOptions = {};
  }

  // Ensure skipLibCheck is true to avoid checking most declaration files in node_modules
  config.compilerOptions.skipLibCheck = true;

  // We don't want to exclude @subql types from node_modules
  // So we don't modify the exclude property

  const parsedConfig = ts.parseJsonConfigFileContent(config, ts.sys, path.dirname(tsconfigPath));

  if (parsedConfig.errors.length > 0) {
    const errorMessages = parsedConfig.errors
      .map((error) =>
        ts.formatDiagnostic(error, {
          getCanonicalFileName: (fileName) => fileName,
          getNewLine: () => ts.sys.newLine,
          getCurrentDirectory: () => ts.sys.getCurrentDirectory(),
        })
      )
      .join('\n');

    throw new Error(`Error parsing tsconfig.json:\n${errorMessages}`);
  }

  // Create a program with updated compiler options
  const compilerOptions = {
    ...parsedConfig.options,
    noEmit: true, // We only want type checking, not emitting files
    skipLibCheck: true, // Skip checking declaration files in node_modules
  };

  const program = ts.createProgram(parsedConfig.fileNames, compilerOptions);

  // Get the diagnostics
  const diagnostics = ts.getPreEmitDiagnostics(program);

  // If there are any diagnostics, filter and throw if relevant
  if (diagnostics.length > 0) {
    // Filter out errors from node_modules except for @subql packages
    const relevantErrors = diagnostics.filter((diagnostic) => {
      if (!diagnostic.file) return true; // Keep general errors

      // Include errors from project files and @subql packages
      const fileName = diagnostic.file.fileName;
      return !fileName.includes('node_modules') || fileName.includes('node_modules/@subql/');
    });

    // If all errors were from other dependencies, we can proceed
    if (relevantErrors.length === 0) {
      return; // No errors in project code or @subql packages
    }

    // Format errors from project code and @subql packages
    const errorMessages = relevantErrors
      .map((diagnostic) => {
        if (diagnostic.file && diagnostic.start !== undefined) {
          const {character, line} = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
          const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
          return `${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`;
        } else {
          return ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
        }
      })
      .join('\n');

    throw new Error(`TypeScript type checking failed:\n${errorMessages}`);
  }
}

export async function runBundle(
  buildEntries: Record<string, string>,
  projectDir: string,
  outputDir: string,
  isDev = false,
  clean = false
): Promise<void> {
  // Run TypeScript type checking first
  try {
    runTypeCheck(projectDir);
  } catch (error: unknown) {
    // Re-throw with more context
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `TypeScript type checking failed. Fix the errors in your project before building.\n${errorMessage}`
    );
  }

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

  // Injecting polyfills if they exist, this allows setting global variables like TextDecoder/TextEncoder
  const inject = [path.resolve(projectDir, './src/polyfill.ts'), path.resolve(projectDir, './src/polyfills.ts')].filter(
    (file) => fs.existsSync(file)
  );

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
        inject: inject,
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
