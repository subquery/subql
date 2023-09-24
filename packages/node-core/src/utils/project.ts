// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'fs';
import os from 'os';
import path from 'path';
import {DEFAULT_PORT, findAvailablePort, GithubReader, IPFSReader, LocalReader} from '@subql/common';
import {BaseCustomDataSource, BaseDataSource, Reader, TemplateBase} from '@subql/types-core';
import {getAllEntitiesRelations} from '@subql/utils';
import {QueryTypes, Sequelize} from '@subql/x-sequelize';
import Cron from 'cron-converter';
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

export async function updateDataSourcesV1_0_0<DS extends BaseDataSource, CDS extends DS & BaseCustomDataSource>(
  _dataSources: (DS | CDS)[],
  reader: Reader,
  root: string,
  isCustomDs: IsCustomDs<DS, CDS>
): Promise<SubqlProjectDs<DS | CDS>[]> {
  // force convert to updated ds
  return Promise.all(
    _dataSources.map(async (dataSource) => {
      dataSource.startBlock = dataSource.startBlock ?? 1;
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

type IsRuntimeDs = (ds: BaseDataSource) => boolean;

// eslint-disable-next-line @typescript-eslint/require-await
export async function insertBlockFiltersCronSchedules<DS extends BaseDataSource = BaseDataSource>(
  dataSources: DS[],
  getBlockTimestamp: (height: number) => Promise<Date>,
  isRuntimeDs: IsRuntimeDs,
  blockHandlerKind: string
): Promise<DS[]> {
  const cron = new Cron();

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
                  timestampReference = await getBlockTimestamp(startBlock);
                }
                try {
                  cron.fromString(handler.filter.timestamp);
                } catch (e) {
                  throw new Error(`Invalid Cron string: ${handler.filter.timestamp}`);
                }

                const schedule = cron.schedule(timestampReference);
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

export async function loadProjectTemplates<T extends BaseDataSource & TemplateBase>(
  templates: T[] | undefined,
  root: string,
  reader: Reader,
  isCustomDs: IsCustomDs<BaseDataSource, BaseCustomDataSource>
): Promise<SubqlProjectDs<T>[]> {
  if (!templates || !templates.length) {
    return [];
  }
  const dsTemplates = await updateDataSourcesV1_0_0(templates, reader, root, isCustomDs);
  return dsTemplates.map((ds, index) => ({
    ...ds,
    name: templates[index].name,
  })) as SubqlProjectDs<T>[]; // How to get rid of cast here?
}

export function getStartHeight(dataSources: BaseDataSource[]): number {
  const startBlocksList = dataSources.map((item) => item.startBlock || 1);
  if (startBlocksList.length === 0) {
    throw new Error(`Failed to find a valid datasource, Please check your endpoint if specName filter is used.`);
  } else {
    return Math.min(...startBlocksList);
  }
}
