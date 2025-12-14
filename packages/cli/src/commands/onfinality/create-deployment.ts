// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import {McpServer, RegisteredTool} from '@modelcontextprotocol/sdk/server/mcp';
import {Command} from '@oclif/core';
import {z} from 'zod';
import {
  commandLogger,
  Logger,
  makeCLIPrompt,
  makeMCPElicitPrmompt,
  mcpLogger,
  MCPToolOptions,
  Prompt,
  withStructuredResponse,
  zodToFlags,
} from '../../adapters/utils';
import {ROOT_API_URL_PROD} from '../../constants';
import {
  executeProjectDeployment,
  generateDeploymentChain,
  ipfsCID_validate,
  logDeployment,
  projectsInfo,
  promptImageVersion,
  splitEndpoints,
} from '../../controller/deploy-controller';
import {DeploymentDataTypeSchema, DeploymentOptions, V3DeploymentIndexerType} from '../../types';
import {addV, checkToken} from '../../utils';

const createDeploymentInputs = DeploymentOptions.extend({
  ipfsCID: z.string({description: 'The IPFC CID of the published project'}),
});
type CreateDeploymentInputs = z.infer<typeof createDeploymentInputs>;

const createDeploymentOutputs = DeploymentDataTypeSchema;

async function createDeploymentAdapter(
  args: CreateDeploymentInputs,
  logger: Logger,
  prompt: Prompt | null
): Promise<z.infer<typeof createDeploymentOutputs> | undefined> {
  const authToken = await checkToken();

  const validator = await ipfsCID_validate(args.ipfsCID, authToken, ROOT_API_URL_PROD);
  if (!validator.valid) {
    throw new Error('Invalid IPFS CID, please check the CID and try again');
  }

  if (!args.endpoint) {
    if (args.useDefaults || !prompt) {
      throw new Error('Please ensure a valid endpoint is provided');
    }

    args.endpoint = await prompt({
      message: 'Enter endpoint',
      required: true,
      type: 'string',
    });
  }

  args.queryVersion = addV(args.queryVersion);
  args.indexerVersion = addV(args.indexerVersion);

  if (!args.indexerVersion) {
    assert(validator.manifestRunner, 'Please set manifestRunner in your project');

    args.indexerVersion = await promptImageVersion(
      validator.manifestRunner.query.name,
      validator.manifestRunner.query.version,
      args.useDefaults,
      authToken,
      'indexer',
      prompt
    );
  }

  if (!args.queryVersion) {
    assert(validator.manifestRunner, 'Please set manifestRunner in your project');

    args.queryVersion = await promptImageVersion(
      validator.manifestRunner.query.name,
      validator.manifestRunner.query.version,
      args.useDefaults,
      authToken,
      'query',
      prompt
    );
  }

  const projectInfo = await projectsInfo(authToken, args.org, args.projectName, ROOT_API_URL_PROD, args.type);
  const chains: V3DeploymentIndexerType[] = [];
  chains.push(
    generateDeploymentChain({
      cid: args.ipfsCID,
      dictEndpoint: args.dict,
      endpoint: splitEndpoints(args.endpoint),
      flags: args,
      indexerImageVersion: args.indexerVersion,
    })
  );

  logger.info('Deploying SubQuery project to OnFinality managed services');

  return executeProjectDeployment({
    authToken,
    chains,
    flags: args,
    ipfsCID: args.ipfsCID,
    projectInfo,
  });
}

export default class CreateDeployment extends Command {
  static description = 'Create a project deployment on the OnFinality managed services';
  static flags = zodToFlags(createDeploymentInputs);

  async run(): Promise<void> {
    const {flags} = await this.parse(CreateDeployment);
    const logger = commandLogger(this);
    const deploymentOutput = await createDeploymentAdapter(flags, logger, makeCLIPrompt());

    logDeployment(logger, flags.org, flags.projectName, deploymentOutput);
  }
}

const nonInteractiveCreateDeploymentInputs = createDeploymentInputs.extend({
  useDefaults: z.literal(true).default(true),
});

export function registerCreateDeploymentMCPTool(server: McpServer, opts: MCPToolOptions): RegisteredTool {
  return server.registerTool(
    `onfinality.${CreateDeployment.name}`,
    {
      description: CreateDeployment.description,
      inputSchema: (opts.supportsElicitation ? createDeploymentInputs : nonInteractiveCreateDeploymentInputs).shape,
      outputSchema: createDeploymentOutputs.shape,
    },
    withStructuredResponse(async (args) => {
      const logger = mcpLogger(server.server);
      const prompt = opts.supportsElicitation ? makeMCPElicitPrmompt(server) : null;

      return createDeploymentAdapter(args, logger, prompt);
    })
  );
}
