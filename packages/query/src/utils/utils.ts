// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {DefinitionNode, FragmentDefinitionNode, Kind, OperationDefinitionNode} from 'graphql';

export function isOperationDefinitionNode(node: DefinitionNode): node is OperationDefinitionNode {
  return node.kind === Kind.OPERATION_DEFINITION;
}
export function isFragmentDefinitionNode(node: DefinitionNode): node is FragmentDefinitionNode {
  return node.kind === Kind.FRAGMENT_DEFINITION;
}

export function getFragments(definitions: readonly DefinitionNode[]): Record<string, FragmentDefinitionNode> {
  return definitions.filter(isFragmentDefinitionNode).reduce((frags, def) => {
    frags[def.name.value] = def;
    return frags;
  }, {});
}

export function getQueriesAndMutations(definitions: readonly DefinitionNode[]): OperationDefinitionNode[] {
  return definitions.filter(isOperationDefinitionNode);
}
