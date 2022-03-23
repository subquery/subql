// Copyright 2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {PgIntrospectionResultsByKind} from 'graphile-build-pg';
import {makeExtendSchemaPlugin, gql, embed} from 'graphile-utils';

const filter = (event, args) => {
  if (args.mutation && !args.mutation.includes(event.mutation_type)) {
    return false;
  }
  if (args.id && !args.id.includes(event.id)) {
    return false;
  }
  return true;
};

export const PgSubscriptionPlugin = makeExtendSchemaPlugin((build) => {
  const {inflection, pgIntrospectionResultsByKind} = build;

  const typeDefs = [
    gql`
      enum MutationType {
        INSERT
        UPDATE
        DELETE
      }

      type SubscriptionPayload {
        id: ID!
        mutation_type: MutationType!
        _entity: JSON
      }
    `,
  ];

  // Generate subscription fields for all database tables
  (pgIntrospectionResultsByKind as PgIntrospectionResultsByKind).class.forEach((table) => {
    if (!table.namespace || table.name === '_metadata') return;

    const field = inflection.allRows(table);
    const topic = `${table.namespace.name}.${table.name}`;
    typeDefs.push(
      gql`
        extend type Subscription {
          ${field}(id: [ID!], mutation: [MutationType!]): SubscriptionPayload
          @pgSubscription(
            topic: ${embed(topic)}
            filter: ${embed(filter)}
          )
        }`
    );
  });

  return {typeDefs};
});
