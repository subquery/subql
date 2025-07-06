// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import {input} from '@inquirer/prompts';
import {McpServer, RegisteredTool} from '@modelcontextprotocol/sdk/server/mcp';
import {Command} from '@oclif/core';
import {getMultichainManifestPath, getProjectRootAndManifest} from '@subql/common';
import chalk from 'chalk';
import YAML from 'yaml';
import {z} from 'zod';
import {
  commandLogger,
  getMCPStructuredResponse,
  getMCPWorkingDirectory,
  Logger,
  makeCLIPrompt,
  makeMCPElicitPrmompt,
  mcpLogger,
  MCPToolOptions,
  Prompt,
  withStructuredResponse,
  zodToFlags,
} from '../../adapters/utils';
import {BASE_PROJECT_URL, ROOT_API_URL_PROD} from '../../constants';
import {
  executeProjectDeployment,
  generateDeploymentChain,
  ipfsCID_validate,
  projectsInfo,
  promptImageVersion,
  splitMultichainDataFields,
} from '../../controller/deploy-controller';
import {getDirectoryCid, uploadToIpfs} from '../../controller/publish-controller';
import {DeploymentDataTypeSchema, DeploymentOptions, V3DeploymentIndexerType} from '../../types';
import {addV, checkToken} from '../../utils';

const createMultichainDeploymentInputs = DeploymentOptions.extend({
  location: z
    .string({description: 'The path to the project, this can be a directory or a project manifest file.'})
    .optional(),
  ipfs: z.string({description: 'An additional IPFS endpoint to upload to'}).optional(),
});
type CreateMultichainDeploymentInputs = z.infer<typeof createMultichainDeploymentInputs>;

const createMultichainDeploymentOutputs = DeploymentDataTypeSchema;

async function createMultichainDeploymentAdapter(
  workingDir: string,
  args: CreateMultichainDeploymentInputs,
  logger: Logger,
  prompt?: Prompt
): Promise<z.infer<typeof createMultichainDeploymentOutputs> | undefined> {
  const authToken = await checkToken();

  // Make sure build first, generated project yaml could be added to the project (instead of ts)
  const location = path.resolve(workingDir, args.location ?? '');
  const project = getProjectRootAndManifest(location);

  const fullPaths = project.manifests.map((manifest) => path.join(project.root, manifest));

  let multichainManifestPath = getMultichainManifestPath(location);
  if (!multichainManifestPath) {
    throw new Error(
      'Selected project is not multi-chain. Please set correct file.\n\n https://academy.subquery.network/build/multi-chain.html'
    );
  }

  multichainManifestPath = path.join(project.root, multichainManifestPath);
  const multichainManifestObject = YAML.parse(fs.readFileSync(multichainManifestPath, 'utf8'));

  logger.info('Uploading project to IPFS');
  const fileToCidMap = await uploadToIpfs(fullPaths, authToken.trim(), multichainManifestPath, args.ipfs).catch((e) => {
    throw new Error(`Failed to upload to IPFS`, {cause: e});
  });
  logger.info('Uploaded project to IPFS');

  // Multichain query descriptor, The IPFS provided for deployment here must be a directory
  const ipfsCID = getDirectoryCid(fileToCidMap);
  assert(ipfsCID, 'Multichain deployment CID not found');

  const projectInfo = await projectsInfo(authToken, args.org, args.projectName, ROOT_API_URL_PROD, args.type);
  const chains: V3DeploymentIndexerType[] = [];

  const endpoints = splitMultichainDataFields(args.endpoint);
  const dictionaries = splitMultichainDataFields(args.dict);
  const indexerVersions = splitMultichainDataFields(args.indexerVersion);

  if (!args.queryVersion) {
    args.queryVersion = await promptImageVersion(
      multichainManifestObject.query.name,
      multichainManifestObject.query.version,
      args.useDefaults,
      authToken,
      'query',
      prompt
    );
  }

  args.queryVersion = addV(args.queryVersion);

  for await (const [multichainProjectPath, multichainProjectCid] of fileToCidMap) {
    if (!multichainProjectPath || multichainProjectPath === path.basename(multichainManifestPath)) continue;

    const validator = await ipfsCID_validate(multichainProjectCid, authToken, ROOT_API_URL_PROD);

    if (!validator.valid) {
      throw new Error(`Invalid IPFS CID for ${multichainProjectPath}`);
    }

    assert(validator.chainId, 'Please set chainId in your project');
    if (!indexerVersions[validator.chainId]) {
      assert(validator.manifestRunner, 'Please set manifestRunner in your project');
      indexerVersions[validator.chainId] = await promptImageVersion(
        validator.manifestRunner.node.name,
        validator.manifestRunner.node.version,
        args.useDefaults,
        authToken,
        'indexer',
        // `Enter indexer version for ${multichainProjectPath}`,
        prompt
      );
    }

    indexerVersions[validator.chainId] = addV(indexerVersions[validator.chainId]);

    if (!endpoints[validator.chainId]) {
      if (args.useDefaults) {
        throw new Error(
          'Please ensure a endpoint valid is passed using --endpoint flag with syntax chainId:rpc_endpoint,chainId2:rpc_endpoint2...'
        );
      }

      endpoints[validator.chainId] = await input({
        message: `Enter endpoint for ${multichainProjectPath}`,
        required: true,
      });
    }

    chains.push(
      generateDeploymentChain({
        cid: multichainProjectCid,
        dictEndpoint: dictionaries[validator.chainId],
        endpoint: [endpoints[validator.chainId]],
        flags: args,
        indexerImageVersion: indexerVersions[validator.chainId],
      })
    );
  }

  logger.info(`Deploying SubQuery multi-chain project to Hosted Service, IPFS: ${ipfsCID}`);

  return executeProjectDeployment({
    // log: logger.info.bind(logger),
    authToken,
    chains,
    flags: args,
    ipfsCID: ipfsCID,
    projectInfo,
  });
}

export default class CreateMultichainDeployment extends Command {
  static description = 'Create a multi-chain project deployment no the OnFinality managed services';
  static flags = zodToFlags(createMultichainDeploymentInputs);

  async run(): Promise<void> {
    const {flags} = await this.parse(CreateMultichainDeployment);

    const deploymentOutput = await createMultichainDeploymentAdapter(
      process.cwd(),
      flags,
      commandLogger(this),
      makeCLIPrompt()
    );

    if (deploymentOutput) {
      this.log(`Project: ${deploymentOutput.projectKey}
    Status: ${chalk.blue(deploymentOutput.status)}
    DeploymentID: ${deploymentOutput.id}
    Deployment Type: ${deploymentOutput.type}
    Indexer version: ${deploymentOutput.indexerImage}
    Query version: ${deploymentOutput.queryImage}
    Endpoint: ${deploymentOutput.endpoint}
    Dictionary Endpoint: ${deploymentOutput.dictEndpoint}
    Query URL: ${deploymentOutput.queryUrl}
    Project URL: ${BASE_PROJECT_URL}/org/${flags.org}/project/${flags.projectName}
    Advanced Settings for Query: ${JSON.stringify(deploymentOutput.configuration.config.query)}
    Advanced Settings for Indexer: ${JSON.stringify(deploymentOutput.configuration.config.indexer)}
`);
    } else {
      this.log(`Project: ${flags.projectName} has been re-deployed`);
    }
  }
}

const nonInteractiveCreateMultichainDeploymentInputs = createMultichainDeploymentInputs.required({
  indexerVersion: true,
  queryVersion: true,
  // dict: true, // TODO check if this is required
  endpoint: true,
});

export function registerCreateMultichainDeploymentMCPTool(server: McpServer, opts: MCPToolOptions): RegisteredTool {
  return server.registerTool(
    CreateMultichainDeployment.id,
    {
      description: CreateMultichainDeployment.description,
      inputSchema: (opts.supportsElicitation
        ? createMultichainDeploymentInputs
        : nonInteractiveCreateMultichainDeploymentInputs
      ).shape,
      // There is a slight workaround here, the adapter will return an optional output, getting the structured output also makes it optional
      outputSchema: getMCPStructuredResponse(createMultichainDeploymentOutputs).shape,
    },
    withStructuredResponse(async (args) => {
      const cwd = await getMCPWorkingDirectory(server);
      const logger = mcpLogger(server.server);
      const prompt = opts.supportsElicitation ? makeMCPElicitPrmompt(server) : undefined;

      return createMultichainDeploymentAdapter(cwd, args, logger, prompt);
    })
  );
}
