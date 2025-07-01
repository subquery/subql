// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {Command, Config, Interfaces} from '@oclif/core';
import {z} from 'zod';
import {FORCE_FLAG, MCP_FLAG} from '../constants';
import {fetchNetworks} from '../controller/init-controller';
import {registerBuildMCPTool} from './build';
import {registerPublishMCPTool} from './publish';
import {registerInitMCPTool} from './init';
import {mcpLogger} from '../adapters/utils';

// const packageVersion = require('../../package.json').version;
//

/**
 * Converts mcp tool args to a string array that can be used as input for an oclif command.
 * @param positionalArgs - An array of positional arguments that are passed to the command, these don't include the flag.
 * @param args
 * @returns A string array to be used for an oclif command input.
 */
function argsToCommandInput(positionalArgs: string[], args: Record<string, any>): string[] {
  return Object.entries(args).flatMap(([flag, value]) => {
    // Args are poitional and don't include the flag
    if (positionalArgs.includes(flag)) {
      return [value];
    }

    // Oclif boolean flags don't have a value
    if (typeof value === 'boolean') {
      if (value === false) {
        return [];
      }
      return [`--${flag}`];
    }

    // TODO test integers and other non-string types
    return [`--${flag}`, value.toString()];
  });
}

/**
 * Generates a Zod schema for the input of a command based on its args and flags.
 * @param command - The command to generate the input schema for.
 * @returns A Zod schema representing the input of the command.
 */
function getInputSchema(command: Command.Loadable): z.ZodRawShape {
  const inputSchema: z.ZodRawShape = {};

  Object.values(command.args).forEach((arg) => {
    if (arg.hidden) {
      return;
    }
    let valueType: z.ZodTypeAny = z.string({
      description: arg.description,
    });

    if (!arg.required) {
      valueType = valueType.optional();
    }
    if (arg.default) {
      valueType = valueType.default(arg.default);
    }

    inputSchema[arg.name] = valueType;
  });

  Object.values(command.flags).forEach((flag) => {
    // Hide force flag, were going add it manually
    if (flag.hidden || flag.deprecated || flag.name === FORCE_FLAG.name) {
      return;
    }

    // TODO handle other types, oclif doesn't keep this in its types
    let valueType: z.ZodTypeAny =
      flag.type === 'boolean'
        ? z.boolean({description: flag.description})
        : flag.options
          ? z.union(flag.options.map((option) => z.literal(option)) as any)
          : z.string({description: flag.description});
    if (!flag.required) {
      valueType = valueType.optional();
    }
    if (flag.default) {
      valueType = valueType.default(flag.default);
    }

    inputSchema[flag.name] = valueType;
  });

  return inputSchema;
}

export default class MCP extends Command {
  static description = 'Runs an MCP (Model Context Protocol) over stdio';

  async run(): Promise<void> {
    const config = await Config.load({
      root: __dirname,
    });
    const server = new McpServer(
      {
        name: 'SubQuery CLI',
        version: 'packageVersion',
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

    for (const command of config.commands) {
      if (command.id === this.id) {
        continue; // Skip the MCP command itself
      }

      if (command.id === 'build') {
        // registerBuildMCPTool(server);
        continue;
      }
      if (command.id === 'publish') {
        // registerPublishMCPTool(server);
        continue;
      }
      if (command.id === 'init') {
        // registerInitMCPTool(server);
        continue;
      }

      const inputSchema = getInputSchema(command);

      server.registerTool(
        command.id,
        {
          description: command.description,
          inputSchema,
        },
        async (args, meta) => {
          const inst = await command.load();

          const parsedArgs = argsToCommandInput(Object.keys(command.args), args);
          if (command.flags.mcp) {
            parsedArgs.push(`--${MCP_FLAG.name}`);
          }
          if (command.flags.force) {
            parsedArgs.push(`--force`);
          }

          // Mock progress because we have some long running tasks and progress resets timeouts
          let progress = 0;
          const steps = 100;
          const interval = setInterval(() => {
            if (meta._meta?.progressToken) {
              void meta.sendNotification({
                method: 'notifications/progress',
                params: {
                  progressToken: meta._meta?.progressToken,
                  progress: progress++,
                  total: steps,
                  message: `Progress update ${progress}/${steps}`,
                },
              });
            }
          }, 2_000);

          try {
            await inst.run(parsedArgs, {
              root: __dirname,
              // logger: mcpLogger(server.server),
            });

            return {
              content: [
                {
                  type: 'text',
                  text: `Tool ${command.id} executed successfully!`,
                },
              ],
            };
          } catch (e) {
            await server.server.sendLoggingMessage({
              level: 'error',
              message: `Error running command ${command.id}: ${e}: ${(e as any).stack}`,
            });
            throw e;
          } finally {
            clearInterval(interval);
          }
        }
      );
    }

    const transport = new StdioServerTransport();
    await server.connect(transport);

    /**
     * MCP is intended to have 1 server per client
     * We get the clients capabilities to determine the tools used
     */
    server.server.oninitialized = async () => {
      const capabilities = server.server.getClientCapabilities();
      registerBuildMCPTool(server);
      registerPublishMCPTool(server);

      registerInitMCPTool(server, capabilities?.elicitation !== undefined);
    };
  }
}
