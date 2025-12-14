// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {McpServer, RegisteredTool} from '@modelcontextprotocol/sdk/server/mcp';
import {Command} from '@oclif/core';
import {z} from 'zod';
import {getMCPStructuredResponse, withStructuredResponse, zodToFlags} from '../../adapters/utils';
import {networkNameSchema} from '../../controller/network/constants';
import {deploymentSchema, listDeployments} from '../../controller/network/list-deployments';
import {jsonToTable} from '../../utils';

const listDeploymentsInputs = z.object({
  network: networkNameSchema,
  projectId: z.string({description: 'The ID of the project to list deployments for'}),
});
type ListDeploymentsInputs = z.infer<typeof listDeploymentsInputs>;

const listDeploymentsOutputs = z.object({
  deployments: z.array(deploymentSchema),
});

async function listDeploymentsAdapter(args: ListDeploymentsInputs): Promise<z.infer<typeof listDeploymentsOutputs>> {
  const deployments = await listDeployments(args.network, args.projectId);

  return {deployments};
}

export default class ListNetworkDeployments extends Command {
  static description = 'List deployments for a SubQuery project';
  static flags = zodToFlags(listDeploymentsInputs);

  async run(): Promise<void> {
    const {flags} = await this.parse(ListNetworkDeployments);

    const result = await listDeploymentsAdapter(flags);

    if (!result.deployments.length) {
      this.log('This project has no deployments');
      return;
    }

    this.log(
      jsonToTable(
        result.deployments.map(({deploymentId, meta, metadata, ...rest}) => {
          const subMeta = meta ? {version: meta.version, description: meta.description.split('\n')[0]} : {metadata};
          return {
            deploymentId,
            ...subMeta,
            ...rest,
          };
        })
      )
    );
  }
}

export function registerListNetworkDeploymentsMCPTool(server: McpServer): RegisteredTool {
  return server.registerTool(
    `network.${ListNetworkDeployments.name}`,
    {
      description: ListNetworkDeployments.description,
      inputSchema: listDeploymentsInputs.shape,
      outputSchema: getMCPStructuredResponse(listDeploymentsOutputs).shape,
    },
    withStructuredResponse(async (args) => {
      return listDeploymentsAdapter(args);
    })
  );
}
