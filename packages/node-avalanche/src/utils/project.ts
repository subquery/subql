// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  GithubReader,
  IPFSReader,
  LocalReader,
  Reader,
} from '@subql/common-avalanche';
import {
  ChainTypes,
  CustomDatasourceV0_2_0,
  isCustomDs,
  isRuntimeDataSourceV0_3_0,
  loadChainTypes,
  loadChainTypesFromJs,
  parseChainTypes,
  RuntimeDataSourceV0_0_1,
  RuntimeDataSourceV0_2_0,
} from '@subql/old-common-substrate';
import {
  SubqlRuntimeHandler,
  SubqlCustomHandler,
  SubqlHandler,
  SubqlHandlerKind,
} from '@subql/types';
import yaml from 'js-yaml';
import tar from 'tar';
import { SubqlProjectDs } from '../configure/SubqueryProject';

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
    throw new Error(`can not find package.json within directory ${root}`);
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

export async function updateDataSourcesV0_0_1(
  _dataSources: RuntimeDataSourceV0_0_1[],
  reader: Reader,
): Promise<SubqlProjectDs[]> {
  // force convert to updated ds
  const dataSources = _dataSources as SubqlProjectDs[];
  await Promise.all(
    dataSources.map(async (ds) => {
      ds.mapping.entryScript = await loadDataSourceScript(reader);
    }),
  );
  return dataSources;
}

export async function updateDataSourcesV0_2_0(
  _dataSources: (RuntimeDataSourceV0_2_0 | CustomDatasourceV0_2_0)[],
  reader: Reader,
  root: string,
): Promise<SubqlProjectDs[]> {
  // force convert to updated ds
  return Promise.all(
    _dataSources.map(async (dataSource) => {
      const entryScript = await loadDataSourceScript(
        reader,
        dataSource.mapping.file,
      );
      const file = await updateDataSourcesEntry(
        reader,
        dataSource.mapping.file,
        root,
        entryScript,
      );
      if (isCustomDs(dataSource)) {
        if (dataSource.processor) {
          dataSource.processor.file = await updateProcessor(
            reader,
            root,
            dataSource.processor.file,
          );
        }
        if (dataSource.assets) {
          for (const [, asset] of dataSource.assets) {
            if (reader instanceof LocalReader) {
              asset.file = path.resolve(root, asset.file);
            } else {
              const res = await reader.getFile(asset.file);
              const outputPath = path.resolve(
                root,
                asset.file.replace('ipfs://', ''),
              );
              await fs.promises.writeFile(outputPath, res as string);
              asset.file = outputPath;
            }
          }
        }
        return {
          ...dataSource,
          mapping: { ...dataSource.mapping, entryScript, file },
        };
      } else if (isRuntimeDataSourceV0_3_0(dataSource)) {
        if (dataSource.assets) {
          for (const [, asset] of dataSource.assets) {
            if (reader instanceof LocalReader) {
              asset.file = path.resolve(root, asset.file);
            } else {
              const res = await reader.getFile(asset.file);
              const outputPath = path.resolve(
                root,
                asset.file.replace('ipfs://', ''),
              );
              await fs.promises.writeFile(outputPath, res as string);
              asset.file = outputPath;
            }
          }
        }
        return {
          ...dataSource,
          mapping: { ...dataSource.mapping, entryScript, file },
        };
      }
    }),
  );
}

async function updateDataSourcesEntry(
  reader: Reader,
  file: string,
  root: string,
  script: string,
): Promise<string> {
  if (reader instanceof LocalReader) return file;
  else if (reader instanceof IPFSReader || reader instanceof GithubReader) {
    const outputPath = `${path.resolve(root, file.replace('ipfs://', ''))}.js`;
    await fs.promises.writeFile(outputPath, script);
    return outputPath;
  }
}

async function updateProcessor(
  reader: Reader,
  root: string,
  file: string,
): Promise<string> {
  if (reader instanceof LocalReader) {
    return path.resolve(root, file);
  } else {
    const res = await reader.getFile(file);
    const outputPath = `${path.resolve(root, file.replace('ipfs://', ''))}.js`;
    await fs.promises.writeFile(outputPath, res);
    return outputPath;
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
    // we will download it to a temp folder, and load them within sandbox
    const res = await reader.getFile(file);
    let raw: unknown;
    try {
      raw = yaml.load(res);
      return parseChainTypes(raw);
    } catch (e) {
      const chainTypesPath = `${path.resolve(
        root,
        file.replace('ipfs://', ''),
      )}.js`;
      await fs.promises.writeFile(chainTypesPath, res);
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

export async function getProjectRoot(reader: Reader): Promise<string> {
  if (reader instanceof LocalReader) return reader.root;
  if (reader instanceof IPFSReader || reader instanceof GithubReader) {
    return makeTempDir();
  }
}
