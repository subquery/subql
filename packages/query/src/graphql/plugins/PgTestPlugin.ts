// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {Context, Plugin} from 'graphile-build';
// import {GraphQLInputFieldConfigMap} from "graphql";
// import {PgClass, PgProc} from "graphile-build-pg";
// import {QueryBuilder} from "graphile-build-pg";

export const PgTestPlugin: Plugin = (builder) => {
  builder.hook(
    // return build;
    'GraphQLObjectType:fields:field',
    (fields, build, context) => {
      // should use a queryBuilder ???
      // GraphQLInputObjectType sets the query input ? or would it be GraphQLObjectType:fields
      // this should handle the logical (should be similar to AggregatePlugin)
      console.log(fields);
      return fields;
    }
  );
  builder.hook('GraphQLObjectType:fields:field:args', (args, build, context) => {
    // the args takes e.g.
    //
    console.log(args);
    return args;
  });
};
