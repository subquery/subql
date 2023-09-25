// Copyright 2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {UserInputError} from 'apollo-server-express';
import type {ApolloServerPlugin} from 'apollo-server-plugin-base';
import {DocumentNode, GraphQLError, visit} from 'graphql';
import {Pool} from 'pg';

function parseBlockHeightArgs(document: DocumentNode): string[] {
  const values = [];
  visit(document, {
    Argument(node) {
      if (node.name.value === 'blockHeight' && node.value.kind === 'StringValue') {
        values.push(node.value.value);
      }
    },
  });
  return values;
}

async function fetchLastProcessedHeight(pgClient: Pool, schemaName: string): Promise<bigint | null> {
  const result = await pgClient.query(`select value from "${schemaName}"._metadata WHERE key = 'lastProcessedHeight'`);
  if (!result.rowCount) {
    return null;
  }
  return BigInt(result.rows[0].value);
}

function validateBlockHeightArgs(args: string[], lastProcessedHeight: bigint): GraphQLError | null {
  for (const arg of args) {
    if (!arg.match(/^\d+$/)) {
      return new UserInputError(`Invalid block height: ${arg}`);
    }
    const value = BigInt(arg);
    if (value > lastProcessedHeight) {
      return new UserInputError(`Block height ${arg} is larger than last processed height: ${lastProcessedHeight}`);
    }
  }
  return null;
}

// Plugin to check that any provided blockHeight arg is <= lastProcessedHeight
export function BlockHeightArgValidationPlugin({dbSchema}: {dbSchema: string}): ApolloServerPlugin {
  return {
    // eslint-disable-next-line
    requestDidStart: async () => {
      return {
        async responseForOperation({context, document}) {
          const blockHeightArgs = parseBlockHeightArgs(document);
          if (!blockHeightArgs) {
            return null;
          }
          const lastProcessedHeight = await fetchLastProcessedHeight(context.pgClient, dbSchema);
          if (!lastProcessedHeight) {
            return null;
          }
          const error = validateBlockHeightArgs(blockHeightArgs, lastProcessedHeight);
          if (!error) {
            return null;
          }
          return {errors: [error]};
        },
      };
    },
  } as ApolloServerPlugin;
}
