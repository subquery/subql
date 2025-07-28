// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {Command} from '@oclif/core';
import {MCPToolOptions} from '../adapters/utils';
import {fetchNetworks} from '../controller/init-controller';
import {registerBuildMCPTool} from './build';
import {registerCodegenMCPTool} from './codegen';
import {registerImportAbiMCPTool} from './codegen/import-abi';
import {registerInitMCPTool} from './init';
import {registerMigrateSubgraphMCPTool} from './migrate';
import {registerMultichainAddMCPTool} from './multi-chain/add';
import {registerAddDeploymentBoostMCPTool} from './network/add-deployment-boost';
import {registerCreateNetworkDeploymentMCPTool} from './network/create-deployment';
import {registerCreateNetworkProjectMCPTool} from './network/create-project';
import {registerListBoostsMCPTool} from './network/list-boosts';
import {registerListNetworkDeploymentsMCPTool} from './network/list-deployments';
import {registerListNetworkProjectsMCPTool} from './network/list-projects';
import {registerRemoveDeploymentBoostMCPTool} from './network/remove-deployment-boost';
import {registerCreateDeploymentMCPTool} from './onfinality/create-deployment';
import {registerCreateMultichainDeploymentMCPTool} from './onfinality/create-multichain-deployment';
import {registerCreateProjectMCPTool} from './onfinality/create-project';
import {registerDeleteProjectMCPTool} from './onfinality/delete-project';
import {registerPromoteDeploymentMCPTool} from './onfinality/promote-deployment';
import {registerPublishMCPTool} from './publish';

const pjson = require('../../package.json');

export default class MCP extends Command {
  static description = 'Runs an MCP (Model Context Protocol) server over stdio';

  async run(): Promise<void> {
    const server = new McpServer(
      {
        name: 'SubQuery CLI',
        version: pjson.version,
        description:
          'Interact with SubQuery CLI commands using Model Context Protocol. This allows you to initialize, build and deploy your SubQuery projects.',
      },
      {
        capabilities: {
          logging: {}, // Required to enable logging
        },
      }
    );

    // Note: Cursor and Zed don't currently support MCP resources.
    server.registerResource(
      'supported-networks',
      'subql://supported-networks', //new ResourceTemplate('subql://supported-networks', {list: undefined}),
      {
        title: 'Supported Networks',
        description: 'A list of networks SubQuery can initialize a project for',
      },
      async (uri: any) => {
        const networkTemplates = await fetchNetworks();
        const networkNames = networkTemplates.flatMap((fam) => fam.networks.map((net) => net.name));

        return {
          contents: [
            {
              uri,
              text: networkNames.join(', '),
            },
          ],
        };
      }
    );

    // There needs to be at least one tool registered before a client connects otherwise tools arent discovered
    registerCodegenMCPTool(server);
    registerMultichainAddMCPTool(server);
    registerCreateProjectMCPTool(server);
    registerDeleteProjectMCPTool(server);
    registerPromoteDeploymentMCPTool(server);
    registerBuildMCPTool(server);
    registerPublishMCPTool(server);
    registerMigrateSubgraphMCPTool(server);

    registerListNetworkProjectsMCPTool(server);
    registerListNetworkDeploymentsMCPTool(server);
    registerListBoostsMCPTool(server);

    const transport = new StdioServerTransport();
    await server.connect(transport);

    /**
     * MCP is intended to have 1 server per client
     * We get the clients capabilities to determine the tools used
     */
    server.server.oninitialized = () => {
      const capabilities = server.server.getClientCapabilities();

      const opts: MCPToolOptions = {
        supportsElicitation: capabilities?.elicitation !== undefined,
      };

      registerImportAbiMCPTool(server, opts);
      registerCreateDeploymentMCPTool(server, opts);
      registerCreateMultichainDeploymentMCPTool(server, opts);
      registerInitMCPTool(server, opts);
      registerCreateNetworkProjectMCPTool(server, opts);
      registerCreateNetworkDeploymentMCPTool(server, opts);
      registerAddDeploymentBoostMCPTool(server, opts);
      registerRemoveDeploymentBoostMCPTool(server, opts);
    };

    return new Promise(() => {
      // Keep the server running indefinitely
    });
  }
}
