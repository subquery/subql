// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import path from 'path';
import {Command, Flags} from '@oclif/core';
import chalk from 'chalk';
import cli from 'cli-ux';
import inquirer from 'inquirer';
import {BASE_PROJECT_URL, DEFAULT_DEPLOYMENT_TYPE, ROOT_API_URL_PROD} from '../../constants';
import YAML from 'yaml'
import {
  createDeployment,
  dictionaryEndpoints,
  imageVersions,
  ipfsCID_validate,
  processEndpoints,
  projectsInfo,
  splitEndpoints, splitMultichainDataFields,
  updateDeployment,
} from '../../controller/deploy-controller';
import {
  IndexerAdvancedOpts,
  multichainDataFieldType,
  QueryAdvancedOpts,
  V3DeploymentIndexerType
} from '../../types';
import {addV, checkToken, promptWithDefaultValues, resolveToAbsolutePath, valueOrPrompt} from '../../utils';
import MultiChainAdd from "./add";
import Build from "../build";
import {getMultichainManifestPath, getProjectRootAndManifest} from "@subql/common";
import fs, {existsSync, readFileSync} from "fs";
import {uploadToIpfs} from "../../controller/publish-controller";

const ACCESS_TOKEN_PATH = path.resolve(process.env.HOME, '.subql/SUBQL_ACCESS_TOKEN');

export default class MultiChainDeploy extends Command {
  static description = 'Deployment to hosted service';

  static flags = {
    location: Flags.string({char: 'f', description: 'from project folder or specify manifest file', required: true}),

    org: Flags.string({description: 'Enter organization name'}),
    projectName: Flags.string({description: 'Enter project name'}),
    ipfs: Flags.string({description: 'IPFS gateway endpoint', required: false}),

    type: Flags.string({options: ['stage', 'primary'], default: DEFAULT_DEPLOYMENT_TYPE, required: false}),
    indexerVersion: Flags.string({description: 'Enter indexer-version', required: false}),
    queryVersion: Flags.string({description: 'Enter query-version', required: false}),
    dict: Flags.string({description: 'Enter dictionary', required: false}),
    endpoint: Flags.string({description: 'Enter endpoint', required: false}),
    //indexer set up flags
    indexerUnsafe: Flags.boolean({description: 'Enable indexer unsafe', required: false}),
    indexerBatchSize: Flags.integer({description: 'Enter batchSize from 1 to 30', required: false}),
    indexerSubscription: Flags.boolean({description: 'Enable Indexer subscription', required: false}),
    disableHistorical: Flags.boolean({description: 'Disable Historical Data', required: false}),
    indexerUnfinalized: Flags.boolean({
      description: 'Index unfinalized blocks (requires Historical to be enabled)',
      required: false,
    }),
    indexerStoreCacheThreshold: Flags.integer({
      description: 'The number of items kept in the cache before flushing',
      required: false,
    }),
    disableIndexerStoreCacheAsync: Flags.boolean({
      description: 'If enabled the store cache will flush data asynchronously relative to indexing data.',
      required: false,
    }),
    indexerWorkers: Flags.integer({description: 'Enter worker threads from 1 to 5', required: false, max: 5}),

    //query flags
    queryUnsafe: Flags.boolean({description: 'Enable indexer unsafe', required: false}),
    querySubscription: Flags.boolean({description: 'Enable Query subscription', required: false}),
    queryTimeout: Flags.integer({description: 'Enter timeout from 1000ms to 60000ms', required: false}),
    queryMaxConnection: Flags.integer({description: 'Enter MaxConnection from 1 to 10', required: false}),
    queryAggregate: Flags.boolean({description: 'Enable Aggregate', required: false}),

    useDefaults: Flags.boolean({
      char: 'd',
      description: 'Use default values for indexerVersion, queryVersion, dictionary, endpoint',
      required: false,
    }),
  };

  async run(): Promise<void> {
    const {flags} = await this.parse(MultiChainDeploy);
    let {dict, endpoint, indexerVersion, org, projectName, queryVersion} = flags;

    const authToken = await checkToken(process.env.SUBQL_ACCESS_TOKEN, ACCESS_TOKEN_PATH);

    const location = flags.location ? resolveToAbsolutePath(flags.location) : process.cwd();

    // Make sure build first, generated project yaml could be added to the project (instead of ts)
    const project = getProjectRootAndManifest(location);

    const fullPaths = project.manifests.map((manifest) => path.join(project.root, manifest));

    let multichainManifestPath = getMultichainManifestPath(location);
    if (!multichainManifestPath) {
      throw new Error(chalk.bgRedBright('Selected project is not multichain. Please set correct file.\n\n https://academy.subquery.network/build/multi-chain.html'));
    }

    multichainManifestPath = path.join(project.root, multichainManifestPath);


    const fileToCidMap = await uploadToIpfs(fullPaths, authToken.trim(), multichainManifestPath, flags.ipfs).catch(
      (e) => this.error(e)
    );


    org = await valueOrPrompt(org, 'Enter organisation', 'Organisation is required');
    projectName = await valueOrPrompt(projectName, 'Enter project name', 'Project name is required');

    // Multichain query descriptor
    const ipfsCID = fileToCidMap.get(path.basename(multichainManifestPath));

    const projectInfo = await projectsInfo(authToken, org, projectName, ROOT_API_URL_PROD, flags.type);
    const chains: V3DeploymentIndexerType[] = [];

    let endpoints: multichainDataFieldType = splitMultichainDataFields(endpoint);
    let dictionaries: multichainDataFieldType = splitMultichainDataFields(dict);
    let indexerVersions: multichainDataFieldType =  splitMultichainDataFields(indexerVersion);


    let queryAD: QueryAdvancedOpts = {
      unsafe: flags.queryUnsafe,
      subscription: flags.querySubscription,
      queryTimeout: flags.queryTimeout,
      maxConnection: flags.queryMaxConnection,
      aggregate: flags.queryAggregate,
    };

    let indexerAD: IndexerAdvancedOpts = {
      unsafe: flags.indexerUnsafe,
      batchSize: flags.indexerBatchSize,
      subscription: flags.indexerSubscription,
      historicalData: !flags.disableHistorical,
      unfinalizedBlocks: flags.indexerUnfinalized,
      storeCacheThreshold: flags.indexerStoreCacheThreshold,
      disableStoreCacheAsync: !flags.disableIndexerStoreCacheAsync,
    };

    let multichainYaml=YAML.parse(
      fs.readFileSync(multichainManifestPath, 'utf8')
    )

    if (!queryVersion) {
      try {
        const queryAvailableVersions = await imageVersions(
          multichainYaml.query.name,
          multichainYaml.query.version,
          authToken,
          ROOT_API_URL_PROD
        );
        if (!flags.useDefaults) {
          const response = await promptWithDefaultValues(inquirer, `Enter query version`, null, queryAvailableVersions, true);
          queryVersion = response;
        } else {
          queryVersion = queryAvailableVersions[0];
        }
      } catch (e) {
        throw new Error(chalk.bgRedBright('Indexer version is required'));
      }
    }

    for await (let [multichainProjectPath,multichainProjectCid] of fileToCidMap)
    {
      if (!multichainProjectPath || multichainProjectPath==path.basename(multichainManifestPath)) continue;

      const validator = await ipfsCID_validate(multichainProjectCid, authToken, ROOT_API_URL_PROD);
      queryVersion = addV(queryVersion);

      if (!validator.valid) {
        throw new Error(chalk.bgRedBright('Invalid IPFS CID'));
      }

      if (!indexerVersions[validator.chainId])
      {
        try {
          const indexerAvailableVersions = await imageVersions(
            validator.manifestRunner.node.name,
            validator.manifestRunner.node.version,
            authToken,
            ROOT_API_URL_PROD
          );
          if (!flags.useDefaults) {
            indexerVersions[validator.chainId] = await promptWithDefaultValues(
              inquirer,
              `Enter indexer version for ${multichainProjectPath}`,
              null,
              indexerAvailableVersions,
              true
            );
          } else {
            indexerVersions[validator.chainId] = indexerAvailableVersions[0];
          }
        } catch (e) {
          throw new Error(chalk.bgRedBright('Indexer version is required'));
        }
      }

      indexerVersions[validator.chainId] = addV(indexerVersions[validator.chainId]);


      if (!endpoints[validator.chainId]) {
        if (flags.useDefaults) {
          throw new Error(chalk.red('Please ensure a valid is passed using --endpoint flag with syntax chainId:rpc_endpoint,chainId2:rpc_endpoint2...'));
        }

        endpoints[validator.chainId] = await promptWithDefaultValues(cli, `Enter endpoint for ${multichainProjectPath}`, undefined, null, true);
      }


      if (!dictionaries[validator.chainId])
      {
        const validateDictEndpoint = processEndpoints(await dictionaryEndpoints(ROOT_API_URL_PROD), validator.chainId);
        if (!flags.useDefaults && !validateDictEndpoint) {
          dictionaries[validator.chainId] = await promptWithDefaultValues(cli, `Enter dictionary for ${multichainProjectPath}`, validateDictEndpoint, null, false);
        } else {
          dictionaries[validator.chainId] = validateDictEndpoint;
        }
      }


      chains.push(
        {
          cid: multichainProjectCid,
          dictEndpoint: dictionaries[validator.chainId],
          endpoint: endpoints[validator.chainId],
          indexerImageVersion: indexerVersions[validator.chainId],
          indexerAdvancedSettings: {
            indexer: indexerAD,
          },
          extraParams: flags.indexerWorkers ?
            {
              workers: {
                num: flags.indexerWorkers,
              },
            } :
            {}
        },
      );
    }


    if (projectInfo !== undefined) {
      await updateDeployment(
        org,
        projectName,
        projectInfo.id,
        authToken,
        ipfsCID,
        queryVersion,
        queryAD,
        chains,
        ROOT_API_URL_PROD
      );
      this.log(`Project: ${projectName} has been re-deployed`);
    } else {
      this.log('Deploying SubQuery project to Hosted Service');
      const deploymentOutput = await createDeployment(
        org,
        projectName,
        authToken,
        ipfsCID,
        queryVersion,
        flags.type,
        queryAD,
        chains,
        ROOT_API_URL_PROD
      ).catch((e) => this.error(e));

      // Managed service does some interesting things: `disableStoreCacheAsync: true` -> `--store-cache-async=true`, we are just inverting it to resolve logging confusion.
      if (
        deploymentOutput.configuration.config.indexer &&
        deploymentOutput.configuration.config.indexer.disableStoreCacheAsync === false
      ) {
        deploymentOutput.configuration.config.indexer.disableStoreCacheAsync = true;
      }

      this.log(`Project: ${deploymentOutput.projectKey}
      \nStatus: ${chalk.blue(deploymentOutput.status)}
      \nDeploymentID: ${deploymentOutput.id}
      \nDeployment Type: ${deploymentOutput.type}
      \nIndexer version: ${deploymentOutput.indexerImage}
      \nQuery version: ${deploymentOutput.queryImage}
      \nEndpoint: ${deploymentOutput.endpoint}
      \nDictionary Endpoint: ${deploymentOutput.dictEndpoint}
      \nQuery URL: ${deploymentOutput.queryUrl}
      \nProject URL: ${BASE_PROJECT_URL}/project/${deploymentOutput.projectKey}
      \nAdvanced Settings for Query: ${JSON.stringify(deploymentOutput.configuration.config.query)}
      \nAdvanced Settings for Indexer: ${JSON.stringify(deploymentOutput.configuration.config.indexer)}
      `);
    }
  }
}
