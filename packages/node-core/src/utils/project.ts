// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'fs';
import os from 'os';
import path from 'path';
import {DEFAULT_PORT, GithubReader, IPFSReader, LocalReader} from '@subql/common';
import {
  BaseAssetsDataSource,
  BaseCustomDataSource,
  BaseDataSource,
  BaseTemplateDataSource,
  Reader,
} from '@subql/types-core';
import {findAvailablePort} from '@subql/utils';
import {QueryTypes, Sequelize} from '@subql/x-sequelize';
import {stringToArray, getSchedule} from 'cron-converter';
import tar from 'tar';
import {NodeConfig} from '../configure/NodeConfig';
import {StoreService} from '../indexer';
import {getLogger} from '../logger';
import {exitWithError} from '../process';

const logger = getLogger('Project-Utils');

export async function getValidPort(argvPort?: number): Promise<number> {
  const validate = (x: any) => {
    const p = parseInt(x);
    return isNaN(p) ? null : p;
  };

  const port = validate(argvPort) ?? (await findAvailablePort(DEFAULT_PORT));
  if (!port) {
    const errMsg = `Unable to find available port (tried ports in range (${DEFAULT_PORT}..${
      DEFAULT_PORT + 10
    })). Try setting a free port manually by setting the --port flag`;
    exitWithError(errMsg, logger);
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
    exitWithError(new Error(`Unable to fetch all schemas`, {cause: err}), logger);
  }
  if (!schemas.includes(schema)) {
    return undefined;
  }
  return schema;
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

export type IsCustomDs<DS, CDS> = (x: DS | CDS) => x is CDS;
// TODO remove this type, it would result in a breaking change though
/**
 * @deprecated Please unwrap the datasource from this type
 * */
export type SubqlProjectDs<DS extends BaseDataSource> = DS;

export function getModulos<DS extends BaseDataSource, CDS extends DS & BaseCustomDataSource>(
  dataSources: DS[],
  isCustomDs: IsCustomDs<DS, CDS>,
  blockHandlerKind: string
): number[] {
  const modulos: number[] = [];
  for (const ds of dataSources) {
    if (isCustomDs(ds)) {
      continue;
    }
    for (const handler of ds.mapping.handlers) {
      if (handler.kind === blockHandlerKind && handler.filter && handler.filter.modulo) {
        modulos.push(handler.filter.modulo);
      }
    }
  }
  return modulos;
}

export function isAssetsDs(ds: unknown): ds is BaseAssetsDataSource {
  return !!(ds as any).assets;
}

export async function updateDataSourcesV1_0_0<DS extends BaseDataSource, CDS extends DS & BaseCustomDataSource>(
  _dataSources: (DS | CDS)[],
  reader: Reader,
  root: string,
  isCustomDs: IsCustomDs<DS, CDS>
): Promise<(DS | CDS)[]> {
  // force convert to updated ds
  return Promise.all(
    _dataSources.map(async (dataSource) => {
      dataSource.startBlock = dataSource.startBlock ?? 1;
      const entryScript = await loadDataSourceScript(reader, dataSource.mapping.file);
      if (isAssetsDs(dataSource) && dataSource.assets) {
        for (const [, asset] of dataSource.assets.entries()) {
          // Only need to resolve path for local file
          if (reader instanceof LocalReader) {
            asset.file = path.resolve(root, asset.file);
          } else {
            asset.file = await fetchAndSaveFile(reader, root, asset.file, '');
          }
        }
      }
      const file = await updateDataSourcesEntry(reader, dataSource.mapping.file, root, entryScript);
      if (isCustomDs(dataSource)) {
        if (dataSource.processor) {
          dataSource.processor.file = await updateProcessor(reader, root, dataSource.processor.file);
        }
        return {
          ...dataSource,
          mapping: {...dataSource.mapping, file},
        };
      } else {
        return {
          ...dataSource,
          mapping: {...dataSource.mapping, file},
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

export async function initDbSchema(schema: string, storeService: StoreService): Promise<void> {
  await storeService.init(schema);
}

export type IsRuntimeDs<DS> = (ds: DS) => ds is DS;

// eslint-disable-next-line @typescript-eslint/require-await
export async function insertBlockFiltersCronSchedules<DS extends BaseDataSource = BaseDataSource>(
  dataSources: DS[],
  getBlockTimestamp: (height: number) => Promise<Date | undefined>,
  isRuntimeDs: IsRuntimeDs<DS>,
  blockHandlerKind: string
): Promise<DS[]> {
  dataSources = await Promise.all(
    dataSources.map(async (ds) => {
      if (isRuntimeDs(ds)) {
        const startBlock = ds.startBlock ?? 1;
        let timestampReference: Date;

        ds.mapping.handlers = await Promise.all(
          ds.mapping.handlers.map(async (handler) => {
            if (handler.kind === blockHandlerKind) {
              if (handler.filter?.timestamp) {
                if (!timestampReference) {
                  const blockTimestamp = await getBlockTimestamp(startBlock);
                  if (!blockTimestamp) {
                    throw new Error(
                      `Could not apply cronSchedule, failed to get block timestamp for block ${startBlock}`
                    );
                  } else {
                    timestampReference = blockTimestamp;
                  }
                }

                let cronArr: number[][];
                try {
                  cronArr = stringToArray(handler.filter.timestamp);
                } catch (e) {
                  throw new Error(`Invalid Cron string: ${handler.filter.timestamp}`);
                }

                const schedule = getSchedule(cronArr, timestampReference);
                handler.filter.cronSchedule = {
                  schedule: schedule,
                  get next() {
                    return Date.parse(this.schedule.next().format());
                  },
                };
              }
            }
            return handler;
          })
        );
      }
      return ds;
    })
  );

  return dataSources;
}

export async function loadProjectTemplates<T extends BaseTemplateDataSource>(
  templates: T[] | undefined,
  root: string,
  reader: Reader,
  isCustomDs: IsCustomDs<T, T & BaseCustomDataSource>
): Promise<T[]> {
  if (!templates || !templates.length) {
    return [];
  }

  const templateIsCustomDs = (template: T): template is T & BaseCustomDataSource =>
    isCustomDs(template) && 'name' in template;
  const dsTemplates = await updateDataSourcesV1_0_0(templates, reader, root, templateIsCustomDs);
  return dsTemplates.map((ds, index) => ({
    ...ds,
    name: templates[index].name,
  }));
}

export function getStartHeight(dataSources: BaseDataSource[]): number {
  const startBlocksList = dataSources.map((item) => item.startBlock || 1);
  if (startBlocksList.length === 0) {
    throw new Error(`Failed to find a valid datasource, Please check your endpoint if specName filter is used.`);
  } else {
    return Math.min(...startBlocksList);
  }
}
