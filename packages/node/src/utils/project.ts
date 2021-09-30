// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import os from 'os';
import path from 'path';
import { RegisteredTypes } from '@polkadot/types/types';
import { blake2AsHex } from '@polkadot/util-crypto';
import {
  buildSchemaFromString,
  ChainTypes,
  CustomDatasourceV0_2_0,
  GithubReader,
  IPFSReader,
  loadChainTypes,
  loadChainTypesFromJs,
  LocalReader,
  parseChainTypes,
  ProjectManifestV0_0_1Impl,
  ProjectManifestV0_2_0Impl,
  ProjectNetworkConfig,
  Reader,
  RuntimeDataSourceV0_0_1,
  RuntimeDataSourceV0_2_0,
} from '@subql/common';
import {
  SubqlRuntimeHandler,
  SubqlCustomHandler,
  SubqlHandler,
  SubqlHandlerKind,
  SubqlDatasource,
} from '@subql/types';
import yaml from 'js-yaml';
import { pick } from 'lodash';
import tar from 'tar';
import { SubqlProjectDs, SubqueryProject } from '../configure/SubqueryProject';

export async function prepareProjectDir(projectPath: string): Promise<string> {
  const stats = fs.statSync(projectPath);
  if (stats.isFile()) {
    const sep = path.sep;
    const tmpDir = os.tmpdir();
    const tempPath = fs.mkdtempSync(`${tmpDir}${sep}`);
    // Will promote errors if incorrect format/extension
    await tar.x({ file: projectPath, cwd: tempPath });
    return tempPath.concat('/package');
  } else if (stats.isDirectory()) {
    return projectPath;
  }
}

// We cache this to avoid repeated reads from fs
const projectEntryCache: Record<string, string> = {};

export function getProjectEntry(root: string): string {
  const pkgPath = path.join(root, 'package.json');
  try {
    if (!projectEntryCache[pkgPath]) {
      const content = fs.readFileSync(pkgPath).toString();
      const pkg = JSON.parse(content);
      if (!pkg.main) {
        return './dist';
      }
      projectEntryCache[pkgPath] = pkg.main.startsWith('./')
        ? pkg.main
        : `./${pkg.main}`;
    }

    return projectEntryCache[pkgPath];
  } catch (err) {
    throw new Error(
      `can not find package.json within directory ${this.option.root}`,
    );
  }
}

export function isBaseHandler(
  handler: SubqlHandler,
): handler is SubqlRuntimeHandler {
  return Object.values<string>(SubqlHandlerKind).includes(handler.kind);
}

export function isCustomHandler<K extends string, F>(
  handler: SubqlHandler,
): handler is SubqlCustomHandler<K, F> {
  return !isBaseHandler(handler);
}

async function syncRemoteFileToLocal(
  reader: Reader,
  root: string,
  inputFile: string,
  ext?: string,
  content?: string,
): Promise<string> {
  const res = content ?? (await reader.getFile(inputFile));
  const name = blake2AsHex(inputFile).substr(2, 10);
  const fileName = ext ? `${name}${ext}` : name;
  const outputPath = path.resolve(root, fileName);
  await fs.promises.writeFile(outputPath, res as string);
  return outputPath;
}

export async function updateDataSources(
  _dataSources:
    | RuntimeDataSourceV0_0_1[]
    | (RuntimeDataSourceV0_2_0 | CustomDatasourceV0_2_0)[],
  reader: Reader,
  root: string,
): Promise<SubqlProjectDs[]> {
  // force convert to updated ds
  await Promise.all(
    _dataSources.map(async (ds) => {
      if (ds.mapping.file) {
        ds.mapping.entryScript = await loadDataSourceScript(
          reader,
          ds.mapping.file,
        );
        ds.mapping.file = await updateDataSourcesEntry(
          reader,
          ds.mapping.file,
          root,
          ds.mapping.entryScript,
        );
      } else {
        ds.mapping.entryScript = await loadDataSourceScript(reader);
      }
      if (ds.processor) {
        ds.processor.file = await updateProcessor(
          reader,
          root,
          ds.processor.file,
        );
      }
      if (ds.assets) {
        for (const [, asset] of ds.assets) {
          if (reader instanceof LocalReader) {
            asset.file = path.resolve(root, asset.file);
          } else {
            asset.file = await syncRemoteFileToLocal(reader, root, asset.file);
          }
        }
      }
    }),
  );
  return _dataSources as SubqlProjectDs[];
}

async function updateDataSourcesEntry(
  reader: Reader,
  file: string,
  root: string,
  script: string,
): Promise<string> {
  if (reader instanceof LocalReader) return file;
  else if (reader instanceof IPFSReader || reader instanceof GithubReader) {
    return syncRemoteFileToLocal(reader, root, file, '.js', script);
  }
}

async function updateProcessor(
  reader: Reader,
  root: string,
  file: string,
): Promise<string> {
  if (reader instanceof LocalReader) {
    return file;
  } else {
    return syncRemoteFileToLocal(reader, root, file, '.js');
  }
}

export async function getChainTypes(
  reader: Reader,
  root: string,
  file: string,
): Promise<ChainTypes> {
  // If the project is load from local, we will direct load them
  if (reader instanceof LocalReader) {
    return loadChainTypes(file, root);
  } else {
    // If it is stored in ipfs or other resources, we will use the corresponding reader to read the file
    // Because ipfs not provide extension of the file, it is difficult to determine its format
    // We will use yaml.load to try to load the script and parse them to supported chain types
    // if it failed, we will give it another another attempt, and assume the script written in js
    // we will use syncRemoteFileToLocal method to download it to a temp folder, and load them within sandbox
    const res = await reader.getFile(file);
    let raw: unknown;
    try {
      raw = yaml.load(res);
      return parseChainTypes(raw);
    } catch (e) {
      const chainTypesPath = await syncRemoteFileToLocal(
        reader,
        root,
        file,
        '.js',
        res,
      );
      raw = loadChainTypesFromJs(chainTypesPath); //root not required, as it been packed in single js
      return parseChainTypes(raw);
    }
  }
}

export async function loadDataSourceScript(
  reader: Reader,
  file?: string,
): Promise<string> {
  let entry: string;
  //For RuntimeDataSourceV0_0_1
  if (!file) {
    const pkg = await reader.getPkg();
    if (pkg === undefined) throw new Error('Project package.json is not found');
    if (pkg.main) {
      entry = pkg.main.startsWith('./') ? pkg.main : `./${pkg.main}`;
    } else {
      entry = './dist';
    }
  }
  //Else get file
  const entryScript = await reader.getFile(file ? file : entry);
  if (entryScript === undefined) {
    throw new Error(`Entry file ${entry} for datasource not exist`);
  }
  return entryScript;
}

async function makeTempDir(): Promise<string> {
  const sep = path.sep;
  const tmpDir = os.tmpdir();
  return fs.promises.mkdtemp(`${tmpDir}${sep}`);
}

export async function getProjectRoot(
  reader: Reader,
  path: string,
): Promise<string> {
  if (reader instanceof LocalReader) return path;
  if (reader instanceof IPFSReader || reader instanceof GithubReader) {
    return makeTempDir();
  }
}
