// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import type {ApolloServerPlugin} from 'apollo-server-plugin-base';
import {
  GraphQLSchema,
  Kind,
  GraphQLError,
  DocumentNode,
  DefinitionNode,
  ValidationContext,
  TypeInfo,
  SelectionNode,
  FragmentDefinitionNode,
  OperationDefinitionNode,
  ASTNode,
} from 'graphql';

export function validateQueryDepth(maxDepth: number, context: ValidationContext): void {
  const {definitions} = context.getDocument();
  const fragments = getFragments(definitions);
  const operations = getQueriesAndMutations(definitions);

  for (const operation of operations) {
    if (operation.name && operation.name.value === 'IntrospectionQuery') {
      continue;
    }
    checkDepth(operation, fragments, 0, maxDepth);
  }
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

export function checkDepth(
  node: ASTNode,
  fragments: Record<string, FragmentDefinitionNode>,
  depthSoFar: number,
  maxDepth: number
): void {
  if (depthSoFar > maxDepth) {
    throw new GraphQLError(`Query is too deep. Maximum depth allowed is ${maxDepth}.`, [node]);
  }
  switch (node.kind) {
    case Kind.FIELD: {
      if (!node.selectionSet) {
        return;
      }

      node.selectionSet.selections.forEach((selection: SelectionNode) => {
        checkDepth(selection, fragments, depthSoFar + 1, maxDepth);
      });

      return;
    }
    case Kind.FRAGMENT_SPREAD: {
      return checkDepth(fragments[node.name.value], fragments, depthSoFar, maxDepth);
    }
    case Kind.INLINE_FRAGMENT:
    case Kind.FRAGMENT_DEFINITION:
    case Kind.OPERATION_DEFINITION: {
      node.selectionSet.selections.forEach((selection: SelectionNode) => {
        checkDepth(selection, fragments, depthSoFar, maxDepth);
      });
      return;
    }
    default:
      break;
  }
}

export function queryDepthLimitPlugin(options: {schema: GraphQLSchema; maxDepth?: number}): ApolloServerPlugin {
  return {
    requestDidStart: () => {
      return {
        didResolveOperation(context: {document: DocumentNode}) {
          if (options?.maxDepth === undefined) {
            return;
          }
          const validationContext = new ValidationContext(
            options.schema,
            context.document,
            new TypeInfo(options.schema),
            (err) => {
              throw err;
            }
          );
          validateQueryDepth(options.maxDepth, validationContext);
        },
      };
    },
  } as unknown as ApolloServerPlugin;
}
