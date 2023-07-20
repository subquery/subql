// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import fs from 'fs';
import {buildASTSchema, DocumentNode, extendSchema, GraphQLSchema, parse, Source} from 'graphql';
import {directives} from './schema/directives';
import {scalas} from './schema/scalas';

function loadBaseSchema(): GraphQLSchema {
  const schema = buildASTSchema(scalas);
  return extendSchema(schema, directives);
}

export function buildSchemaFromFile(path: string): GraphQLSchema {
  return buildSchemaFromString(fs.readFileSync(path).toString());
}

export function buildSchemaFromString(raw: string): GraphQLSchema {
  const src = new Source(raw);
  const doc = parse(src);
  return buildSchemaFromDocumentNode(doc);
}

export function buildSchemaFromDocumentNode(doc: DocumentNode): GraphQLSchema {
  return extendSchema(loadBaseSchema(), doc);
}
