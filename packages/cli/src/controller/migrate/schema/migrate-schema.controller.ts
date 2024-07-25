// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'fs';
import {
  Source,
  parse,
  print,
  TypeNode,
  NamedTypeNode,
  Kind,
  StringValueNode,
  ValueNode,
  ObjectValueNode,
  ObjectTypeDefinitionNode,
  DefinitionNode,
  DirectiveNode,
  ListValueNode,
  FieldDefinitionNode,
} from 'graphql';

// Extra schema definitions used by the graph
// const subgraphScalars = gql`
//   scalar Int8
//   scalar Timestamp
// `;

// const subgraphDirectives = gql`
//   type FulltextInclude {
//     name: String!
//   }

//   directive @fulltext(name: String!, language: String!, algorithm: String!, include: [FulltextInclude!]!) on OBJECT
// `;

export async function migrateSchema(subgraphSchemaPath: string, subqlSchemaPath: string): Promise<void> {
  await fs.promises.rm(subqlSchemaPath, {force: true});

  const file = await fs.promises.readFile(subgraphSchemaPath);
  const output = migrateSchemaFromString(file.toString('utf8'));
  await fs.promises.writeFile(subqlSchemaPath, output);
  console.log(
    `* schema.graphql has been migrated. If there are any issues see our documentation for more details https://academy.subquery.network/build/graphql.html`
  );
}

// This is the scalars available to Subquery projects.
const subqlScalars = new Set(['String', 'Int', 'Boolean', 'ID', 'Date', 'Bytes', 'Float', 'BigInt', 'BigDecimal']);

export function migrateSchemaFromString(input: string): string {
  const src = new Source(input);
  const doc = parse(src);

  const updated = doc.definitions
    .filter((definition) => {
      if (isObjectType(definition)) {
        const aggregationDirective = definition.directives?.find((d) => d.name.value === 'aggregation');
        if (aggregationDirective) {
          console.warn(`The Aggregation directive is not supported. type="${definition.name.value}" has been removed`);
          return false;
        }
      }

      return true;
    })
    .map((definition) => {
      if (isObjectType(definition)) {
        // Convert fulltext search directives
        if (definition.name.value === '_Schema_') {
          definition.directives?.forEach((directive) => {
            convertFulltextDirective(directive, doc.definitions);
          });
          // No mutations to the global schema
          return definition;
        }

        // Map field types to known types
        (definition as any).fields = definition.fields?.map((field) => {
          modifyTypeNode(field.type, (type) => {
            // SubQuery only supports ID type for id
            if (field.name.value === 'id') {
              (type.name as any).value = 'ID';
            }
            if (type.name.value === 'Int8') {
              (type.name as any).value = 'Int';
            }
            if (type.name.value === 'Timestamp') {
              (type.name as any).value = 'Date';
            }

            convertRelations(doc.definitions, definition, field, type);

            return type;
          });

          return field;
        });

        // Remove unsupported arguments from entity directive
        const entityDirective = definition.directives?.find((d) => d.name.value === 'entity');
        if (!entityDirective) throw new Error('Object is missing entity directive');

        (entityDirective.arguments as any) = entityDirective.arguments?.filter((arg) => {
          if (arg.name.value === 'immutable') {
            console.warn(`Immutable option is not supported. Removing from entity="${definition.name.value}"`);
            return false;
          }
          if (arg.name.value === 'timeseries') {
            console.warn(`Timeseries option is not supported. Removing from entity="${definition.name.value}"`);
            return false;
          }
          return true;
        });
      }

      return definition;
    })
    // Remove the _Schema_ type
    .filter((def) => !(isObjectType(def) && def.name.value === '_Schema_'));

  return print({...doc, definitions: updated});
}

function convertFulltextDirective(directive: DirectiveNode, definitions: readonly DefinitionNode[]) {
  if (directive.name.value !== 'fulltext') return;
  // TODO should add runtime check for StringValueNode
  const name = (directive.arguments?.find((arg) => arg.name.value === 'name')?.value as StringValueNode)?.value;

  const includeOpt = directive.arguments?.find((arg) => arg.name.value === 'include');
  if (!includeOpt) throw new Error("Expected fulltext directive to have an 'include' argument");
  if (includeOpt.value.kind !== Kind.LIST) throw new Error('Expected include argument to be a list');
  if (includeOpt.value.values.length !== 1) {
    throw new Error(`SubQuery only supports fulltext search on a single entity. name=${name}`);
  }

  const includeParams = includeOpt.value.values[0];

  // Get the entity name
  if (!isObjectValueNode(includeParams)) throw new Error(`Expected object value, received ${includeParams.kind}`);
  const entityName = includeParams.fields.find((f) => f.name.value === 'entity')?.value;
  if (!entityName || !isStringValueNode(entityName)) throw new Error('Entity name is invalid');

  // Get the entity fields
  const fields = includeParams.fields.find((f) => f.name.value === 'fields')?.value;
  if (!fields) throw new Error('Unable to find fields for fulltext search');
  if (!isListValueNode(fields)) throw new Error('Expected fields to be a list');
  const fieldNames = fields.values.map((field) => {
    if (!isObjectValueNode(field)) throw new Error('Field is invalid');

    const nameField = field.fields.find((f) => f.name.value === 'name');
    if (!nameField) throw new Error('Fields field is missing name');
    return nameField.value;
  });
  if (!fieldNames.length) throw new Error('Fulltext search requires at least one field');

  // Find the entity to add the directive
  const entity = findEntity(definitions, entityName.value);
  if (!entity) throw new Error(`Unable to find entity ${entityName.value} for fulltext search`);

  // Add the fulltext directive to the entity
  (entity.directives as any) ??= [];
  (entity.directives as any).push(makeFulltextDirective(fieldNames.map((f) => (f as any).value)));
}

// Some relations are handled differently to the Graph, add the necessary directive here
function convertRelations(
  definitions: readonly DefinitionNode[],
  definition: ObjectTypeDefinitionNode,
  field: FieldDefinitionNode,
  type: NamedTypeNode
) {
  // This scalars check is a best effort to find types that are relations
  if (!subqlScalars.has(type.name.value)) {
    if (!field.directives?.find((d) => d.name.value === 'derivedFrom') && isListType(field.type)) {
      // Find the referenced entity
      const entity = findEntity(definitions, type.name.value);
      if (!entity) {
        throw new Error(`Cannot find entity referenced by field ${field.name.value} on type ${definition.name.value}`);
      }

      // Only care if its an entity. i.e. not a JSON type
      if (entity.directives?.find((d) => d.name.value === 'entity')) {
        // Try to find a field with the same name as the type
        let name = '';
        const matches = entity.fields?.filter((field) => isFieldOfType(field.type, definition.name.value));

        if (matches?.length === 1) {
          name = matches?.[0]?.name.value;
        } else {
          if (!matches?.length) {
            console.warn(
              `Unable to find a lookup on ${entity.name.value} for "${definition.name.value}.${field.name.value}". You will need to manually set the "field" property`
            );
          } else {
            console.warn(
              `Found multiple matches of ${entity.name.value} for "${definition.name.value}.${field.name.value}". You will need to manually set the "field" property`
            );
          }
          name = '<replace-me>';
        }

        // Add the necessary directive
        (field.directives as any) ??= [];
        (field.directives as any).push(makeDerivedFromDirective(name));
      }
    }
  }
}

// Drills down to the inner type and runs the modFn on it, this runs in place
function modifyTypeNode(type: TypeNode, modFn: (innerType: NamedTypeNode) => NamedTypeNode): TypeNode {
  if (type.kind === Kind.NON_NULL_TYPE || type.kind === Kind.LIST_TYPE) {
    return modifyTypeNode(type.type, modFn);
  }
  return modFn(type);
}

function isListType(type: TypeNode): boolean {
  if (type.kind === Kind.LIST_TYPE) {
    return true;
  }

  if (type.kind === Kind.NON_NULL_TYPE) {
    return isListType(type.type);
  }

  return false;
}

// Finds the underlying type ignoring nullability
function isFieldOfType(type: TypeNode, desired: string): boolean {
  if (type.kind === Kind.NON_NULL_TYPE) {
    return isFieldOfType(type.type, desired);
  }
  return type.kind !== Kind.LIST_TYPE && type.name.value === desired;
}

function findEntity(definitions: readonly DefinitionNode[], name: string): ObjectTypeDefinitionNode | undefined {
  // Cast can be removed with newver version of typescript
  return definitions.find((def) => isObjectType(def) && def.name.value === name) as
    | ObjectTypeDefinitionNode
    | undefined;
}

function makeFulltextDirective(fields: string[], language = 'english'): DirectiveNode {
  return {
    kind: Kind.DIRECTIVE,
    name: {
      kind: Kind.NAME,
      value: 'fullText',
    },
    arguments: [
      {
        kind: Kind.ARGUMENT,
        name: {
          kind: Kind.NAME,
          value: 'fields',
        },
        value: {
          kind: Kind.LIST,
          values: fields.map((field) => ({
            kind: Kind.STRING,
            value: field,
          })),
        },
      },
      {
        kind: Kind.ARGUMENT,
        name: {
          kind: Kind.NAME,
          value: 'language',
        },
        value: {
          kind: Kind.STRING,
          value: language,
        },
      },
    ],
  } satisfies DirectiveNode;
}

function makeDerivedFromDirective(field: string): DirectiveNode {
  return {
    kind: Kind.DIRECTIVE,
    name: {
      kind: Kind.NAME,
      value: 'derivedFrom',
    },
    arguments: [
      {
        kind: Kind.ARGUMENT,
        name: {
          kind: Kind.NAME,
          value: 'field',
        },
        value: {
          kind: Kind.STRING,
          value: field,
        },
      },
    ],
  } satisfies DirectiveNode;
}

function isObjectType(node: DefinitionNode): node is ObjectTypeDefinitionNode {
  return node.kind === Kind.OBJECT_TYPE_DEFINITION;
}

function isObjectValueNode(node: ValueNode): node is ObjectValueNode {
  return node.kind === Kind.OBJECT;
}

function isListValueNode(node: ValueNode): node is ListValueNode {
  return node.kind === Kind.LIST;
}

function isStringValueNode(node: ValueNode): node is StringValueNode {
  return node.kind === Kind.STRING;
}
