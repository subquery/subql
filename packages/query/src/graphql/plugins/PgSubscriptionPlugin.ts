// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {hashName} from '@subql/utils';
import {PgIntrospectionResultsByKind} from '@subql/x-graphile-build-pg';
import {makeExtendSchemaPlugin, gql, embed} from 'graphile-utils';
import {DocumentNode} from 'graphql';

const filter = (event, args) => {
  if (args.mutation && !args.mutation.includes(event.mutation_type)) {
    return false;
  }
  if (args.id && !args.id.includes(event.id)) {
    return false;
  }
  return true;
};

function makePayload(entityType: string): {type: DocumentNode; name: string} {
  const name = `${entityType}Payload`;
  const type = gql`
    type ${name} {
      id: ID!
      mutation_type: MutationType!
      _entity: ${entityType}
    }
  `;

  return {name, type};
}

export const PgSubscriptionPlugin = makeExtendSchemaPlugin((build) => {
  const {inflection, pgIntrospectionResultsByKind} = build;

  const typeDefs = [
    gql`
      enum MutationType {
        INSERT
        UPDATE
        DELETE
      }
    `,
  ];

  const resolvers: Record<string, any> = {};

  // Generate subscription fields for all database tables
  (pgIntrospectionResultsByKind as PgIntrospectionResultsByKind).class.forEach((table) => {
    if (!table.namespace || table.name === '_metadata') return;

    const field = inflection.allRows(table);
    const type = inflection.tableType(table);

    const {name: payloadName, type: payloadType} = makePayload(type);

    const topic = hashName(table.namespace.name, 'notify_channel', table.name);
    typeDefs.push(
      gql`
        ${payloadType}
        extend type Subscription {
          ${field}(id: [ID!], mutation: [MutationType!]): ${payloadName}
          @pgSubscription(
            topic: ${embed(topic)}
            filter: ${embed(filter)}
          )
        }`
    );
  });

  return {
    typeDefs,
    resolvers,
  };
});
