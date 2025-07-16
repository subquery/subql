// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {JsonRpcProvider} from '@ethersproject/providers';
import {Command} from '@oclif/core';
import {ContractSDK, SubqueryNetwork, networks} from '@subql/contract-sdk';
import {z} from 'zod';
import {commandLogger, Logger, zodToFlags} from '../../adapters/utils';

const networkNames = Object.keys(networks) as [SubqueryNetwork, ...SubqueryNetwork[]];

const sqNetworkProject = 'https://gateway.subquery.network/query/QmQqqmwwaBben8ncfHo3DMnDxyWFk5QcEdTmbevzKj7DBd';

export const listProjectsInputs = z.object({
  address: z.string({description: 'The address of the account that owns the projects'}),
  network: z
    .enum(networkNames as [string, ...string[]], {description: 'The network to check.'})
    .default(networkNames[0]),
  networkRpc: z.string({description: 'Override the network rpc url'}).optional(),
});
export type ListProjectsInputs = z.infer<typeof listProjectsInputs>;

const listProjectOutputs = z.object({});

async function listProjectsAdapter(
  args: ListProjectsInputs,
  logger: Logger
): Promise<z.infer<typeof listProjectOutputs>> {
  logger.info(`Listing projects for address: ${args.address}`);
  const network = args.network as SubqueryNetwork; // TODO find a way not to cast this

  const rpcUrl = args.networkRpc || networks[network].child.rpcUrls[0];

  const provider = new JsonRpcProvider(rpcUrl);
  const sdk = new ContractSDK(provider, {network});

  const numberOfProjects = await sdk.projectRegistry.balanceOf(args.address);

  return numberOfProjects.toNumber();
}

export default class ListProjects extends Command {
  static description = 'List projects for a given account on then SubQuery network';
  static flags = zodToFlags(listProjectsInputs);

  async run(): Promise<void> {
    const {flags} = await this.parse(ListProjects);

    const res = await listProjectsAdapter(flags, commandLogger(this));

    this.log('NUMBER OF PROJECTS', res);
  }
}
