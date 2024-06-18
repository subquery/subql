// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {PgEntity, PgEntityKind, PgProc} from '@subql/x-graphile-build-pg';
import {Plugin, Context} from 'graphile-build';
import {Tsquery} from 'pg-tsquery';

const parser = new Tsquery();

function isProcedure(entity?: PgEntity): entity is PgProc {
  return entity?.kind === PgEntityKind.PROCEDURE;
}

export const PgSearchPlugin: Plugin = (builder) => {
  // Sanitises the search argument for fulltext search using pg-tsquery
  builder.hook('GraphQLObjectType:fields:field', (field, build, {scope: {pgFieldIntrospection}}: Context<any>) => {
    if (isProcedure(pgFieldIntrospection) && pgFieldIntrospection.argNames.includes('search')) {
      return {
        ...field,
        resolve(source, args, ctx, info) {
          if (args.search !== undefined) {
            args.search = parser.parse(args.search)?.toString();
          }
          return field.resolve?.(source, args, ctx, info);
        },
      };
    }

    return field;
  });
};
