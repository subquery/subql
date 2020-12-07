import fs = require('fs');
import {Source, parse, extendSchema, GraphQLSchema, buildASTSchema} from 'graphql';
// import path = require('path')

import {scalas} from './schema/scalas';
import {directives} from './schema/directives';

export function loadBaseSchema(): GraphQLSchema {
  const schema = buildASTSchema(scalas);
  return extendSchema(schema, directives);
}

export function buildSchema(path: string): GraphQLSchema {
  const src = new Source(fs.readFileSync(path).toString());
  const doc = parse(src);
  return extendSchema(loadBaseSchema(), doc);
}
