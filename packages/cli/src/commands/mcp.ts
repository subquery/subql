// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {readFileSync} from 'fs';
import {dirname, join} from 'path';
import {fileURLToPath} from 'url';
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {Command} from '@oclif/core';
import {MCPToolOptions} from '../adapters/utils.js';
import {fetchNetworks} from '../controller/init-controller.js';
import {registerBuildMCPTool} from './build.js';
import {registerImportAbiMCPTool} from './codegen/import-abi.js';
import {registerCodegenMCPTool} from './codegen/index.js';
import {registerInitMCPTool} from './init.js';
import {registerMigrateSubgraphMCPTool} from './migrate.js';
import {registerMultichainAddMCPTool} from './multi-chain/add.js';
import {registerAddDeploymentBoostMCPTool} from './network/add-deployment-boost.js';
import {registerConnectWalletMCPTool} from './network/connect-wallet.js';
import {registerCreateNetworkApiKeyMCPTool} from './network/create-api-key.js';
import {registerCreateNetworkDeploymentMCPTool} from './network/create-deployment.js';
import {registerCreateNetworkFlexPlanMCPTool} from './network/create-flex-plan.js';
import {registerCreateNetworkProjectMCPTool} from './network/create-project.js';
import {registerDisconnectWalletMCPTool} from './network/disconnect-wallet.js';
import {registerListAccountBoostsMCPTool} from './network/list-account-boosts.js';
import {registerListDeploymentBoostsMCPTool} from './network/list-deployment-boosts.js';
import {registerListDeploymentIndexersMCPTool} from './network/list-deployment-indexers.js';
import {registerListNetworkDeploymentsMCPTool} from './network/list-deployments.js';
import {registerListFlexPlansMCPTool} from './network/list-flex-plans.js';
import {registerListNetworkProjectsMCPTool} from './network/list-projects.js';
import {registerRemoveDeploymentBoostMCPTool} from './network/remove-deployment-boost.js';
import {registerStopNetworkFlexPlanMCPTool} from './network/stop-flex-plan.js';
import {registerSwapDeploymentBoostMCPTool} from './network/swap-deployment-boost.js';
import {registerCreateDeploymentMCPTool} from './onfinality/create-deployment.js';
import {registerCreateMultichainDeploymentMCPTool} from './onfinality/create-multichain-deployment.js';
import {registerCreateProjectMCPTool} from './onfinality/create-project.js';
import {registerDeleteProjectMCPTool} from './onfinality/delete-project.js';
import {registerPromoteDeploymentMCPTool} from './onfinality/promote-deployment.js';
import {registerPublishMCPTool} from './publish.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pjson = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf8'));

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
    registerListDeploymentBoostsMCPTool(server);
    registerListDeploymentIndexersMCPTool(server);
    registerListAccountBoostsMCPTool(server);
    registerListFlexPlansMCPTool(server);
    registerCreateNetworkFlexPlanMCPTool(server);
    registerStopNetworkFlexPlanMCPTool(server);
    registerCreateNetworkApiKeyMCPTool(server);
    registerDisconnectWalletMCPTool(server);

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

      registerConnectWalletMCPTool(server, opts);
      registerSwapDeploymentBoostMCPTool(server, opts);
    };

    return new Promise(() => {
      // Keep the server running indefinitely
    });
  }
}
