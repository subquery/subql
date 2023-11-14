// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import type {
  ApolloServerPlugin,
  GraphQLRequestContext,
  GraphQLRequestContextDidResolveOperation,
  GraphQLRequestListener,
} from 'apollo-server-plugin-base';
import {
  GraphQLSchema,
  DefinitionNode,
  FragmentDefinitionNode,
  OperationDefinitionNode,
  Kind,
  FieldNode,
  ValidationContext,
  GraphQLError,
  DocumentNode,
  separateOperations,
} from 'graphql';
import {printError} from 'graphql/error/GraphQLError';
import {ASTValidationContext} from 'graphql/validation/ValidationContext';

type IgnoreRule = string | RegExp | ((fieldName: string) => boolean);

interface DepthLimitOptions {
  ignore?: IgnoreRule | IgnoreRule[];
}

// Helper functions (potentially converted to TypeScript and cleaned up)
function validateQueryDepth(maxDepth: number, context: ASTValidationContext): GraphQLError[] {
  const errors: GraphQLError[] = [];

  const {definitions} = context.getDocument();
  const fragments = getFragments(definitions);
  const operations = getQueriesAndMutations(definitions);

  for (const operation of operations) {
    const depth = determineDepth(operation, fragments, 0, maxDepth, context, operation);
    if (depth > maxDepth) {
      errors.push(new GraphQLError(`Query is too deep: ${depth}. Maximum depth allowed is ${maxDepth}.`, [operation]));
    }
  }

  return errors;
}

// Helper function to get fragments
function getFragments(definitions: readonly any[]): Record<string, any> {
  return definitions
    .filter((def): def is any => def.kind === Kind.FRAGMENT_DEFINITION)
    .reduce((frags, def) => {
      frags[def.name.value] = def;
      return frags;
    }, {});
}

// Helper function to get operations (query/mutation/subscription)
function getQueriesAndMutations(definitions: readonly any[]): any[] {
  return definitions.filter((def): def is any => def.kind === Kind.OPERATION_DEFINITION);
}

// Recursive function to determine the depth of each operation
function determineDepth(
  node: any,
  fragments: Record<string, any>,
  depthSoFar: number,
  maxDepth: number,
  context: ASTValidationContext,
  operationName: string
): number {
  // if (depthSoFar > maxDepth) {
  //   return depthSoFar
  //   // return context.reportError(
  //   //   new GraphQLError(`'${operationName}' exceeds maximum operation depth of ${maxDepth}`, [node])
  //   // );
  // }

  switch (node.kind) {
    case Kind.FIELD: {
      if (!node.selectionSet) {
        return depthSoFar;
      }

      return node.selectionSet.selections.reduce((max, selection) => {
        return Math.max(max, determineDepth(selection, fragments, depthSoFar + 1, maxDepth, context, operationName));
      }, depthSoFar);
    }
    case Kind.FRAGMENT_SPREAD: {
      return determineDepth(fragments[node.name.value], fragments, depthSoFar, maxDepth, context, operationName);
    }
    case Kind.INLINE_FRAGMENT:
    case Kind.FRAGMENT_DEFINITION:
    case Kind.OPERATION_DEFINITION: {
      console.log('operation def');
      return node.selectionSet.selections.reduce((max, selection) => {
        return Math.max(max, determineDepth(selection, fragments, depthSoFar, maxDepth, context, operationName));
      }, depthSoFar);
    }
    default:
      return depthSoFar;
  }
}

export function queryDepthLimitPlugin(options: {
  schema: GraphQLSchema;
  maxDepth?: number;
  ignore?: IgnoreRule;
}): ApolloServerPlugin {
  const maxDepth = options.maxDepth ?? 13; // Default max depth to 5 if not provided
  // const ignoreRules: IgnoreRule[] = options.ignore ? [].concat(options.ignore) : [];

  return {
    requestDidStart: () => {
      return {
        didResolveOperation(context) {
          // console.log(context)
          const validationContext = new ASTValidationContext(context.document, (err) => {
            throw err;
          });
          const errors = validateQueryDepth(maxDepth, validationContext);
          if (errors.length > 0) {
            console.log('e', errors);
            throw new GraphQLError(errors.map((error) => printError(error)).join('\n'));
          }
        },
        // can alter to a 500, bad user input
        // willSendResponse({response}) {
        //   console.log('resp', response);
        // },
      };
    },
  } as unknown as ApolloServerPlugin;
}
