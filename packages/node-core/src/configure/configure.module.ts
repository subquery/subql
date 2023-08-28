// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {handleCreateSubqueryProjectError, LocalReader, makeTempDir, Reader, ReaderFactory} from '@subql/common';
import {camelCase, isNil, omitBy} from 'lodash';
import {ISubqueryProject} from '../indexer/types';
import {getLogger, setLevel} from '../logger';
import {defaultSubqueryName, rebaseArgsWithManifest} from '../utils';
import {IConfig, NodeConfig} from './NodeConfig';
import {IProjectUpgradeService, ProjectUpgradeSevice, upgradableSubqueryProject} from './ProjectUpgrade.service';

const logger = getLogger('configure');

// Check if a subquery name is a valid schema name
export function validDbSchemaName(name: string): boolean {
  if (name.length === 0) {
    return false;
  } else {
    name = name.toLowerCase();
    const regexp = new RegExp('^[a-zA-Z_][a-zA-Z0-9_\\-\\/]{0,62}$');
    const flag0 = !name.startsWith('pg_'); // Reserved identifier
    const flag1 = regexp.test(name); // <= Valid characters, less than 63 bytes
    if (!flag0) {
      logger.error(`Invalid schema name '${name}', schema name must not be prefixed with 'pg_'`);
    }
    if (!flag1) {
      logger.error(
        `Invalid schema name '${name}', schema name must start with a letter or underscore,
         be less than 63 bytes and must contain only valid alphanumeric characters (can include characters '_-/')`
      );
    }
    return flag0 && flag1;
  }
}

// TODO once yargs is in node core we can update
type Args = Record<string, any>; // typeof yargsOptions.argv['argv']

function yargsToIConfig(yargs: Args, nameMapping: Record<string, string> = {}): Partial<IConfig> {
  return Object.entries(yargs).reduce((acc, [key, value]) => {
    if (['_', '$0'].includes(key)) return acc;

    if (key === 'network-registry') {
      try {
        value = JSON.parse(value as string);
      } catch (e) {
        throw new Error('Argument `network-registry` is not valid JSON');
      }
    }
    acc[nameMapping[key] ?? camelCase(key)] = value;
    return acc;
  }, {} as any);
}

function warnDeprecations(argv: Args) {
  if (argv['subquery-name']) {
    logger.warn('Note that argument --subquery-name has been deprecated in favour of --db-schema');
  }
}

// This is used to ensure the same temp dir is used across project upgrades and workers
let rootDir: string;
async function getCachedRoot(reader: Reader, configRoot?: string): Promise<string> {
  if (reader instanceof LocalReader) return reader.root;

  if (configRoot) return configRoot;

  if (!rootDir) {
    rootDir = await makeTempDir();
  }

  return rootDir;
}

export async function registerApp<P extends ISubqueryProject>(
  argv: Args,
  createProject: (
    path: string,
    rawManifest: unknown,
    reader: Reader,
    root: string,
    networkOverrides: Record<string, unknown>
  ) => Promise<P>,
  showHelp: () => void,
  pjson: any,
  nameMapping?: Record<string, string> // Curently only used by cosmos
): Promise<{nodeConfig: NodeConfig; project: P & IProjectUpgradeService<P>}> {
  let config: NodeConfig;
  let rawManifest: unknown;
  let reader: Reader;

  const isTest = argv._[0] === 'test';

  // Override order : Sub-command/Args/Flags > Manifest Runner options > Default configs
  // Therefore, we should rebase the manifest runner options with args first but not the config in the end
  if (argv.config) {
    // get manifest options
    config = NodeConfig.fromFile(argv.config, yargsToIConfig(argv, nameMapping), isTest);
    reader = await ReaderFactory.create(config.subquery, {
      ipfs: config.ipfs,
    });
    rawManifest = await reader.getProjectSchema();
    rebaseArgsWithManifest(argv, rawManifest);
    // use rebased argv generate config to override current config
    config = NodeConfig.rebaseWithArgs(config, yargsToIConfig(argv, nameMapping), isTest);
  } else {
    if (!argv.subquery) {
      logger.error('Subquery path is missing in both cli options and config file');
      showHelp();
      process.exit(1);
    }

    warnDeprecations(argv);
    reader = await ReaderFactory.create(argv.subquery, {
      ipfs: argv.ipfs,
    });
    rawManifest = await reader.getProjectSchema();
    rebaseArgsWithManifest(argv, rawManifest);
    // Create new nodeConfig with rebased argv
    config = new NodeConfig(defaultSubqueryName(yargsToIConfig(argv, nameMapping)), isTest);
  }

  if (!validDbSchemaName(config.dbSchema)) {
    process.exit(1);
  }

  if (config.debug) {
    setLevel('debug');
  }

  const project = await createProject(
    config.subquery,
    rawManifest,
    reader,
    await getCachedRoot(reader, config.root),
    omitBy(
      {
        endpoint: config.networkEndpoints,
        dictionary: config.networkDictionary,
      },
      isNil
    )
  ).catch((err: any) => {
    handleCreateSubqueryProjectError(err, pjson, rawManifest, logger);
    process.exit(1);
  });

  const createParentProject = async (cid: string): Promise<P> => {
    cid = `ipfs://${cid}`;
    const reader = await ReaderFactory.create(cid, {
      ipfs: config.ipfs,
    });
    return createProject(
      cid,
      await reader.getProjectSchema(),
      reader,
      await getCachedRoot(reader, config.root),
      omitBy(
        // Apply the network endpoint and dictionary from the source project to the parent projects if they are not defined in the config
        {
          endpoint: config.networkEndpoints ?? project.network.endpoint,
          dictionary: config.networkDictionary ?? project.network.dictionary,
        },
        isNil
      )
    );
  };

  const projectUpgradeService = await ProjectUpgradeSevice.create(project, createParentProject);

  const upgradeableProject = upgradableSubqueryProject(projectUpgradeService);

  return {project: upgradeableProject, nodeConfig: config};
}
