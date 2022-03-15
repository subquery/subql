// Copyright 2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {PgIntrospectionResultsByKind} from 'graphile-build-pg';
import {makeExtendSchemaPlugin, gql} from 'graphile-utils';

export const PgSubscriptionPlugin = makeExtendSchemaPlugin((build) => {
  const {inflection, pgIntrospectionResultsByKind} = build;

  // Generate subscription fields for all database tables
  const subscriptionFields = (pgIntrospectionResultsByKind as PgIntrospectionResultsByKind).class.reduce(
    (result, table) => {
      if (!table.namespace || table.name === '_metadata') return result;

      const field = inflection.allRows(table);
      const topic = `${table.namespace.name}.${table.name}`;
      result.push(`${field}: SubscriptionPayload @pgSubscription(topic: "${topic}")`);
      return result;
    },
    []
  );

  return {
    typeDefs: gql`
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
      
      extend type Subscription {
        ${subscriptionFields.join('\n')}
      }
    `,
  };
});
