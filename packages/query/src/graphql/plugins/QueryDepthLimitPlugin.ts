// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import type {ApolloServerPlugin} from 'apollo-server-plugin-base';
import {
  GraphQLSchema,
  Kind,
  GraphQLError,
  DocumentNode,
  DefinitionNode,
  printError,
  ValidationContext,
  TypeInfo,
  SelectionNode,
  FragmentDefinitionNode,
  OperationDefinitionNode,
  ASTNode,
} from 'graphql';

export function validateQueryDepth(maxDepth: number, context: ValidationContext): GraphQLError[] {
  const errors: GraphQLError[] = [];

  const {definitions} = context.getDocument();
  const fragments = getFragments(definitions);
  const operations = getQueriesAndMutations(definitions);

  for (const operation of operations) {
    if (operation.name && operation.name.value === 'IntrospectionQuery') {
      continue; // Skip the rest of the loop for this iteration
    }
    const depth = determineDepth(operation, fragments, 0, maxDepth, context);
    if (depth > maxDepth) {
      errors.push(new GraphQLError(`Query is too deep: ${depth}. Maximum depth allowed is ${maxDepth}.`, [operation]));
    }
  }
  return errors;
}

function isOperationDefinitionNode(node: DefinitionNode): node is OperationDefinitionNode {
  return node.kind === Kind.OPERATION_DEFINITION;
}
function isFragmentDefinitionNode(node: DefinitionNode): node is FragmentDefinitionNode {
  return node.kind === Kind.FRAGMENT_DEFINITION;
}

function getFragments(definitions: readonly DefinitionNode[]): Record<string, FragmentDefinitionNode> {
  return definitions.filter(isFragmentDefinitionNode).reduce((frags, def) => {
    frags[def.name.value] = def;
    return frags;
  }, {});
}

function getQueriesAndMutations(definitions: readonly DefinitionNode[]): OperationDefinitionNode[] {
  return definitions.filter(isOperationDefinitionNode);
}

function determineDepth(
  node: ASTNode,
  fragments: Record<string, FragmentDefinitionNode>,
  depthSoFar: number,
  maxDepth: number,
  context: ValidationContext
): number {
  switch (node.kind) {
    case Kind.FIELD: {
      if (!node.selectionSet) {
        return depthSoFar;
      }

      return node.selectionSet.selections.reduce((max: number, selection: SelectionNode) => {
        return Math.max(max, determineDepth(selection, fragments, depthSoFar + 1, maxDepth, context));
      }, depthSoFar);
    }
    case Kind.FRAGMENT_SPREAD: {
      return determineDepth(fragments[node.name.value], fragments, depthSoFar, maxDepth, context);
    }
    case Kind.INLINE_FRAGMENT:
    case Kind.FRAGMENT_DEFINITION:
    case Kind.OPERATION_DEFINITION: {
      return node.selectionSet.selections.reduce((max: number, selection: SelectionNode) => {
        return Math.max(max, determineDepth(selection, fragments, depthSoFar, maxDepth, context));
      }, depthSoFar);
    }
    default:
      return depthSoFar;
  }
}

export function queryDepthLimitPlugin(options: {schema: GraphQLSchema; maxDepth?: number}): ApolloServerPlugin {
  const maxDepth = options.maxDepth ?? 5; // Default max depth to 5 if not provided

  return {
    requestDidStart: () => {
      return {
        didResolveOperation(context: {document: DocumentNode}) {
          const validationContext = new ValidationContext(
            options.schema,
            context.document,
            new TypeInfo(options.schema),
            (err) => {
              throw err;
            }
          );
          const errors = validateQueryDepth(maxDepth, validationContext);
          if (errors.length > 0) {
            throw new GraphQLError(errors.map((error) => error.message).join('\n'));
          }
        },
      };
    },
  } as unknown as ApolloServerPlugin;
}
