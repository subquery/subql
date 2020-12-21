// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import fs from 'fs';
import {Source, parse, extendSchema, GraphQLSchema, buildASTSchema} from 'graphql';

import {scalas} from './schema/scalas';
import {directives} from './schema/directives';

function loadBaseSchema(): GraphQLSchema {
  const schema = buildASTSchema(scalas);
  return extendSchema(schema, directives);
}

export function buildSchema(path: string): GraphQLSchema {
  const src = new Source(fs.readFileSync(path).toString());
  const doc = parse(src);
  return extendSchema(loadBaseSchema(), doc);
}
