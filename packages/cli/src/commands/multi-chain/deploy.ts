// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from "fs";
import path from 'path';
import {Command, Flags} from '@oclif/core';
import {getMultichainManifestPath, getProjectRootAndManifest} from "@subql/common";
import chalk from 'chalk';
import cli from 'cli-ux';
import inquirer from 'inquirer';
import YAML from 'yaml'
import {ROOT_API_URL_PROD} from '../../constants';
import {
  DefaultDeployFlags,
  dictionaryEndpoints,
  executeProjectDeployment,
  generateDeploymentChain,
  imageVersions,
  ipfsCID_validate,
  processEndpoints,
  projectsInfo,
  splitMultichainDataFields,
} from '../../controller/deploy-controller';
import {uploadToIpfs} from "../../controller/publish-controller";
import {MultichainDataFieldType, V3DeploymentIndexerType} from '../../types';
import {addV, checkToken, promptWithDefaultValues, resolveToAbsolutePath, valueOrPrompt} from '../../utils';

export default class MultiChainDeploy extends Command {
  static description = 'Multi-chain deployment to hosted service';

  static flags = Object.assign(DefaultDeployFlags, {
    location: Flags.string({char: 'f', description: 'from project folder or specify manifest file', required: true}),
    ipfs: Flags.string({description: 'IPFS gateway endpoint', required: false}),
  });

  async run(): Promise<void> {
    const {flags} = await this.parse(MultiChainDeploy);

    const authToken = await checkToken();

    const location = flags.location ? resolveToAbsolutePath(flags.location) : process.cwd();

    // Make sure build first, generated project yaml could be added to the project (instead of ts)
    const project = getProjectRootAndManifest(location);

    const fullPaths = project.manifests.map((manifest) => path.join(project.root, manifest));

    let multichainManifestPath = getMultichainManifestPath(location);
    if (!multichainManifestPath) {
      throw new Error(chalk.bgRedBright('Selected project is not multi-chain. Please set correct file.\n\n https://academy.subquery.network/build/multi-chain.html'));
    }

    multichainManifestPath = path.join(project.root, multichainManifestPath);
    const multichainManifestObject = YAML.parse(
      fs.readFileSync(multichainManifestPath, 'utf8')
    )

    const fileToCidMap = await uploadToIpfs(fullPaths, authToken.trim(), multichainManifestPath, flags.ipfs).catch(
      (e) => this.error(e)
    );

    flags.org = await valueOrPrompt(flags.org, 'Enter organisation', 'Organisation is required');
    flags.projectName = await valueOrPrompt(flags.projectName, 'Enter project name', 'Project name is required');

    // Multichain query descriptor
    const ipfsCID = fileToCidMap.get(path.basename(multichainManifestPath));

    const projectInfo = await projectsInfo(authToken, flags.org, flags.projectName, ROOT_API_URL_PROD, flags.type);
    const chains: V3DeploymentIndexerType[] = [];

    const endpoints: MultichainDataFieldType = splitMultichainDataFields(flags.endpoint);
    const dictionaries: MultichainDataFieldType = splitMultichainDataFields(flags.dict);
    const indexerVersions: MultichainDataFieldType = splitMultichainDataFields(flags.indexerVersion);

    if (!flags.queryVersion) {
      try {
        const queryAvailableVersions = await imageVersions(
          multichainManifestObject.query.name,
          multichainManifestObject.query.version,
          authToken,
          ROOT_API_URL_PROD
        );
        if (!flags.useDefaults) {
          flags.queryVersion = await promptWithDefaultValues(inquirer, `Enter query version`, null, queryAvailableVersions, true);
        } else {
          flags.queryVersion = queryAvailableVersions[0];
        }
      } catch (e) {
        throw new Error(chalk.bgRedBright('Query version is required'));
      }
    }
    flags.queryVersion = addV(flags.queryVersion);

    for await (const [multichainProjectPath, multichainProjectCid] of fileToCidMap) {
      if (!multichainProjectPath || multichainProjectPath === path.basename(multichainManifestPath)) continue;

      const validator = await ipfsCID_validate(multichainProjectCid, authToken, ROOT_API_URL_PROD);

      if (!validator.valid) {
        throw new Error(chalk.bgRedBright('Invalid IPFS CID'));
      }

      if (!indexerVersions[validator.chainId]) {
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
          throw new Error(chalk.red('Please ensure a endpoint valid is passed using --endpoint flag with syntax chainId:rpc_endpoint,chainId2:rpc_endpoint2...'));
        }

        endpoints[validator.chainId] = await promptWithDefaultValues(cli, `Enter endpoint for ${multichainProjectPath}`, undefined, null, true);
      }


      if (!dictionaries[validator.chainId]) {
        const validateDictEndpoint = processEndpoints(await dictionaryEndpoints(ROOT_API_URL_PROD), validator.chainId);
        if (!flags.useDefaults && !validateDictEndpoint) {
          dictionaries[validator.chainId] = await promptWithDefaultValues(cli, `Enter dictionary for ${multichainProjectPath}`, validateDictEndpoint, null, false);
        } else {
          dictionaries[validator.chainId] = validateDictEndpoint;
        }
      }


      chains.push(
        generateDeploymentChain({
          cid: multichainProjectCid,
          dictEndpoint: dictionaries[validator.chainId],
          endpoint: [endpoints[validator.chainId]],
          flags: flags,
          indexerImageVersion: indexerVersions[validator.chainId]
        })
      );
    }

    this.log('Deploying SubQuery multi-chain project to Hosted Service');

    await executeProjectDeployment({
      log: this.log,
      authToken: authToken,
      chains: chains,
      flags: flags,
      ipfsCID: ipfsCID,
      org: flags.org,
      projectInfo: projectInfo,
      projectName: flags.projectName,
      queryVersion: flags.queryVersion
    });

  }
}
