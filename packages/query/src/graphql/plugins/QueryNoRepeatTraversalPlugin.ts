// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import type {ApolloServerPlugin} from 'apollo-server-plugin-base';
import {
  GraphQLSchema,
  Kind,
  GraphQLError,
  DocumentNode,
  ValidationContext,
  TypeInfo,
  SelectionNode,
  FragmentDefinitionNode,
  ASTNode,
  isInterfaceType,
  isUnionType,
  isObjectType,
  isEnumType,
} from 'graphql';
import {getFragments, getQueriesAndMutations} from '../../utils/utils';

export function validateQueryDepth(ignoredFields: string[], context: ValidationContext): void {
  const {definitions} = context.getDocument();
  const fragments = getFragments(definitions);
  const operations = getQueriesAndMutations(definitions);

  for (const operation of operations) {
    if (operation.name && operation.name.value === 'IntrospectionQuery') {
      continue;
    }
    checkRepeatTraversal(operation, fragments, ignoredFields);
  }
}

export function checkRepeatTraversal(
  node: ASTNode,
  fragments: Record<string, FragmentDefinitionNode>,
  ignoredFields: string[],
  path: Set<string> = new Set()
): void {
  let fieldName: string | null = null;

  switch (node.kind) {
    case Kind.FIELD: {
      fieldName = node.name.value;
      if (ignoredFields.includes(fieldName)) return;

      if (path.has(fieldName)) {
        throw new GraphQLError(`Repeated traversal detected on '${fieldName}'.`, [node]);
      }

      const newPath = new Set(path);
      if (fieldName !== 'nodes') {
        newPath.add(fieldName); // this should only be limited to entities ?
      }

      if (!node.selectionSet) {
        return;
      }

      node.selectionSet.selections.forEach((selection: SelectionNode) => {
        checkRepeatTraversal(selection, fragments, ignoredFields, newPath);
      });

      return;
    }
    case Kind.FRAGMENT_SPREAD: {
      const fragmentName = node.name.value;
      const fragment = fragments[fragmentName];

      if (!fragment) {
        throw new GraphQLError(`Fragment "${fragmentName}" not found.`, [node]);
      }
      return checkRepeatTraversal(fragment, fragments, ignoredFields, path);
    }
    case Kind.INLINE_FRAGMENT:
    case Kind.FRAGMENT_DEFINITION:
    case Kind.OPERATION_DEFINITION: {
      node.selectionSet.selections.forEach((selection: SelectionNode) => {
        checkRepeatTraversal(selection, fragments, ignoredFields, new Set(path));
      });
      return;
    }
    default:
      return;
  }
}

export function queryNoRepeatTraversalPlugin(options: {
  schema: GraphQLSchema;
  ignoredFields?: string[];
}): ApolloServerPlugin {
  return {
    requestDidStart: () => {
      return {
        didResolveOperation: function (context: {document: DocumentNode}) {
          // const typeMap = options.schema.getTypeMap();
          //
          // // Filter and process types as needed
          // Object.values(typeMap).forEach(type => {
          //     if (isObjectType(type) || isInterfaceType(type) || isUnionType(type) || isEnumType(type)) {
          //         console.log(`Type name: ${type.name}`);
          //     }
          // });

          const validationContext = new ValidationContext(
            options.schema,
            context.document,
            new TypeInfo(options.schema),
            (err) => {
              throw err;
            }
          );
          validateQueryDepth(options.ignoredFields, validationContext);
        },
      };
    },
  } as unknown as ApolloServerPlugin;
}
