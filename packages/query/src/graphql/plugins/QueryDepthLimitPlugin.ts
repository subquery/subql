// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {
  Kind,
  GraphQLError,
  ASTNode,
  DefinitionNode,
  FragmentDefinitionNode,
  OperationDefinitionNode,
  SelectionNode,
  DocumentNode,
} from 'graphql';

export function validateQueryDepth(maxDepth: number, definitions: readonly DefinitionNode[]): number {
  const fragments = getFragments(definitions);
  const operations = getQueriesAndMutations(definitions);
  let maxQueryDepth = 0;

  for (const operation of operations) {
    if (operation.name && operation.name.value === 'IntrospectionQuery') {
      continue;
    }
    const depth = checkDepth(operation, fragments, 0, maxDepth);
    if (depth > maxQueryDepth) {
      maxQueryDepth = depth;
    }
  }

  // Return the max of actual depth or maxDepth (whichever is smaller)
  // This ensures we show the limit when capped
  if (maxQueryDepth > maxDepth) {
    return maxDepth;
  }
  return maxQueryDepth;
}

export function getQueryDepth(document: DocumentNode | readonly DefinitionNode[]): number {
  const definitions = Array.isArray(document) ? document : (document as DocumentNode).definitions;
  const fragments = getFragments(definitions);
  const operations = getQueriesAndMutations(definitions);
  let maxQueryDepth = 0;

  for (const operation of operations) {
    if (operation.name && operation.name.value === 'IntrospectionQuery') {
      continue;
    }
    const depth = checkDepth(operation, fragments, 0, Number.POSITIVE_INFINITY);
    if (depth > maxQueryDepth) {
      maxQueryDepth = depth;
    }
  }

  return maxQueryDepth;
}

function isOperationDefinitionNode(node: DefinitionNode): node is OperationDefinitionNode {
  return node.kind === Kind.OPERATION_DEFINITION;
}
function isFragmentDefinitionNode(node: DefinitionNode): node is FragmentDefinitionNode {
  return node.kind === Kind.FRAGMENT_DEFINITION;
}

function getFragments(definitions: readonly DefinitionNode[]): Record<string, FragmentDefinitionNode> {
  return definitions.filter(isFragmentDefinitionNode).reduce((frags: Record<string, FragmentDefinitionNode>, def) => {
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
): number {
  if (depthSoFar > maxDepth) {
    throw new GraphQLError(`Query is too deep. Maximum depth allowed is ${maxDepth}.`, {nodes: [node]});
  }
  switch (node.kind) {
    case Kind.FIELD: {
      if (!(node as any).selectionSet) {
        return depthSoFar + 1;
      }
      let maxChild = 0;
      for (const selection of (node as any).selectionSet.selections) {
        const child = checkDepth(selection, fragments, depthSoFar + 1, maxDepth);
        if (child > maxChild) maxChild = child;
      }
      return maxChild;
    }
    case Kind.FRAGMENT_SPREAD: {
      return checkDepth(fragments[(node as any).name.value], fragments, depthSoFar, maxDepth);
    }
    case Kind.INLINE_FRAGMENT:
    case Kind.FRAGMENT_DEFINITION:
    case Kind.OPERATION_DEFINITION: {
      let maxChild = depthSoFar;
      for (const selection of (node as any).selectionSet.selections) {
        const child = checkDepth(selection, fragments, depthSoFar, maxDepth);
        if (child > maxChild) maxChild = child;
      }
      return maxChild;
    }
    default:
      return depthSoFar;
  }
}
