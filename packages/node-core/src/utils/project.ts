// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  BaseCustomDataSource,
  BaseDataSource,
  DEFAULT_PORT,
  findAvailablePort,
  GithubReader,
  IPFSReader,
  LocalReader,
  Reader,
} from '@subql/common';
import {getAllEntitiesRelations} from '@subql/utils';
import {QueryTypes, Sequelize} from '@subql/x-sequelize';
import {isNumber, range, uniq, without, flatten} from 'lodash';
import tar from 'tar';
import {NodeConfig} from '../configure/NodeConfig';
import {ISubqueryProject, StoreService} from '../indexer';
import {getLogger} from '../logger';

const logger = getLogger('Project-Utils');

export async function getValidPort(argvPort: number): Promise<number> {
  const validate = (x: any) => {
    const p = parseInt(x);
    return isNaN(p) ? null : p;
  };

  const port = validate(argvPort) ?? (await findAvailablePort(DEFAULT_PORT));
  if (!port) {
    logger.error(
      `Unable to find available port (tried ports in range (${port}..${
        port + 10
      })). Try setting a free port manually by setting the --port flag`
    );
    process.exit(1);
  }
  return port;
}

export async function prepareProjectDir(projectPath: string): Promise<string> {
  const stats = fs.statSync(projectPath);
  if (stats.isFile()) {
    const sep = path.sep;
    const tmpDir = os.tmpdir();
    const tempPath = fs.mkdtempSync(`${tmpDir}${sep}`);
    // Will promote errors if incorrect format/extension
    await tar.x({file: projectPath, cwd: tempPath});
    return tempPath.concat('/package');
  } else if (stats.isDirectory()) {
    return projectPath;
  }
  throw new Error(`Project path: ${projectPath} doesn't exist`);
}

export async function getExistingProjectSchema(
  nodeConfig: NodeConfig,
  sequelize: Sequelize
): Promise<string | undefined> {
  const schema = nodeConfig.dbSchema;

  let schemas: string[];
  try {
    const result = await sequelize.query(`SELECT schema_name FROM information_schema.schemata`, {
      type: QueryTypes.SELECT,
    });
    schemas = result.map((x: any) => x.schema_name);
  } catch (err) {
    logger.error(`Unable to fetch all schemas: ${err}`);
    process.exit(1);
  }
  if (!schemas.includes(schema)) {
    return undefined;
  }
  return schema;
}

export function transformBypassBlocks(bypassBlocks: (number | string)[]): number[] {
  if (!bypassBlocks?.length) return [];

  return uniq(
    flatten(
      bypassBlocks.map((bypassEntry) => {
        if (isNumber(bypassEntry)) return [bypassEntry];
        const splitRange = bypassEntry.split('-').map((val) => parseInt(val.trim(), 10));
        return range(splitRange[0], splitRange[1] + 1);
      })
    )
  );
}

export function cleanedBatchBlocks(bypassBlocks: number[], currentBlockBatch: number[]): number[] {
  return without(currentBlockBatch, ...transformBypassBlocks(bypassBlocks));
}

export async function getEnumDeprecated(sequelize: Sequelize, enumTypeNameDeprecated: string): Promise<unknown[]> {
  const [resultsDeprecated] = await sequelize.query(
    `select e.enumlabel as enum_value
         from pg_type t
         join pg_enum e on t.oid = e.enumtypid
         where t.typname = ?
         order by enumsortorder;`,
    {replacements: [enumTypeNameDeprecated]}
  );
  return resultsDeprecated;
}

type IsCustomDs<DS, CDS> = (x: DS | CDS) => x is CDS;
export type SubqlProjectDs<DS extends BaseDataSource> = DS & {
  mapping: DS['mapping'] & {entryScript: string};
};

export async function updateDataSourcesV1_0_0<DS extends BaseDataSource, CDS extends DS & BaseCustomDataSource>(
  _dataSources: (DS | CDS)[],
  reader: Reader,
  root: string,
  isCustomDs: IsCustomDs<DS, CDS>
): Promise<SubqlProjectDs<DS | CDS>[]> {
  // force convert to updated ds
  return Promise.all(
    _dataSources.map(async (dataSource) => {
      const entryScript = await loadDataSourceScript(reader, dataSource.mapping.file);
      const file = await updateDataSourcesEntry(reader, dataSource.mapping.file, root, entryScript);
      if (isCustomDs(dataSource)) {
        if (dataSource.processor) {
          dataSource.processor.file = await updateProcessor(reader, root, dataSource.processor.file);
        }
        if (dataSource.assets) {
          for (const [, asset] of dataSource.assets) {
            if (reader instanceof LocalReader) {
              asset.file = path.resolve(root, asset.file);
            } else {
              asset.file = await saveFile(reader, root, asset.file, '');
            }
          }
        }
        return {
          ...dataSource,
          mapping: {...dataSource.mapping, entryScript, file},
        };
      } else {
        return {
          ...dataSource,
          mapping: {...dataSource.mapping, entryScript, file},
        };
      }
    })
  );
}

export async function updateDataSourcesEntry(
  reader: Reader,
  file: string,
  root: string,
  script: string
): Promise<string> {
  if (reader instanceof LocalReader) return file;
  else if (reader instanceof IPFSReader || reader instanceof GithubReader) {
    return saveFile(reader, root, file, script);
  }
  throw new Error('Un-known reader type');
}

export async function updateProcessor(reader: Reader, root: string, file: string): Promise<string> {
  if (reader instanceof LocalReader) {
    return path.resolve(root, file);
  } else {
    return fetchAndSaveFile(reader, root, file);
  }
}

export async function fetchAndSaveFile(reader: Reader, root: string, file: string, ext = 'js'): Promise<string> {
  if (!(reader instanceof IPFSReader || reader instanceof GithubReader)) {
    throw new Error('Only IPFS and Github readers can save remote files');
  }
  const res = await reader.getFile(file);
  if (!res) {
    throw new Error(`Unable to read file ${file}`);
  }
  return saveFile(reader, root, file, res, ext);
}

export async function saveFile(reader: Reader, root: string, file: string, data: string, ext = 'js'): Promise<string> {
  if (!(reader instanceof IPFSReader || reader instanceof GithubReader)) {
    throw new Error('Only IPFS and Github readers can save remote files');
  }
  const resolved = path.resolve(root, file.replace('ipfs://', ''));
  const outputPath = ext ? `${resolved}.${ext}` : resolved;
  if (fs.existsSync(outputPath)) {
    return outputPath;
  }
  await fs.promises.writeFile(outputPath, data);
  return outputPath;
}

export async function loadDataSourceScript(reader: Reader, file?: string): Promise<string> {
  let entry = file;
  //For RuntimeDataSourceV0_0_1
  if (!entry) {
    const pkg = await reader.getPkg();
    if (pkg === undefined) throw new Error('Project package.json is not found');
    if (pkg.main) {
      entry = pkg.main.startsWith('./') ? pkg.main : `./${pkg.main}`;
    } else {
      entry = './dist';
    }
  }
  //Else get file
  const entryScript = await reader.getFile(entry);
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
  throw new Error('Un-known reader type');
}

export async function initDbSchema(
  project: ISubqueryProject,
  schema: string,
  storeService: StoreService
): Promise<void> {
  const modelsRelation = getAllEntitiesRelations(project.schema);
  await storeService.init(modelsRelation, schema);
}

export async function initHotSchemaReload(schema: string, storeService: StoreService): Promise<void> {
  await storeService.initHotSchemaReloadQueries(schema);
}
