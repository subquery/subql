// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

//
// v5-native subscription plugin using Grafast subscription patterns.
//
// Generates per-table subscription fields that listen to PostgreSQL NOTIFY
// events (via pgSubscriber / LISTEN) and resolve the _entity by querying
// the underlying table using Grafast resource plans.
//

import {jsonParse} from '@dataplan/json';
import {hashName} from '@subql/utils';
import {get, lambda, listen, context, constant} from 'grafast';
import {DocumentNode} from 'graphql';
import {extendSchema, gql, EXPORTABLE} from 'postgraphile/utils';

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

/**
 * SubQuery PgSubscriptionPlugin (v5 rewrite)
 *
 * Generates per-table subscriptions by iterating pgResources.
 * Each subscription field uses Grafast's listen/subscribePlan pattern.
 */
export const PgSubscriptionPlugin = extendSchema((build: any) => {
  const {inflection} = build;
  const pgRegistry = build.input?.pgRegistry;
  const resources = Object.values(pgRegistry?.pgResources || []) as any[];

  const typeDefs: DocumentNode[] = [
    gql`
      enum MutationType {
        INSERT
        UPDATE
        DELETE
      }
    `,
  ];

  // Build the Subscription.plans object and payload type plans
  const subscriptionPlans: Record<string, any> = {};
  const payloadPlans: Record<string, any> = {};

  for (const resource of resources) {
    const codec = resource.codec;
    if (!codec?.attributes || resource.isUnique || resource.parameters) continue;
    if (codec.name?.includes('_metadata')) continue;

    const baseName = inflection._resourceName ? inflection._resourceName(resource) : resource.name;
    const field = inflection.pluralize(baseName);
    const type = inflection.tableType(codec);

    const {name: payloadName, type: payloadType} = makePayload(type);
    typeDefs.push(payloadType);

    const topic = hashName(resource.namespace ?? 'public', 'notify_channel', codec.name);

    // Extend Subscription with a field for this table
    typeDefs.push(gql`
      extend type Subscription {
        ${field}(id: [ID!], mutation: [MutationType!]): ${payloadName}
      }
    `);

    // subscribePlan: listen to pgSubscriber topic, parse JSON event, filter by id/mutation
    // The listen step produces raw JSON event strings from pg LISTEN/NOTIFY.
    // We jsonParse them and then filter based on args.
    subscriptionPlans[field] = {
      subscribePlan: EXPORTABLE(
        (topic, jsonParse, listen, context, constant) =>
          function subscribePlan(_$root: any, args: any) {
            const ctxStep = context();
            const $pgSubscriber = ctxStep.get('pgSubscriber');
            if (!$pgSubscriber) {
              throw new Error(`PgSubscriptionPlugin: pgSubscriber not available in context for topic "${topic}"`);
            }
            const $topic = constant(topic);
            return listen($pgSubscriber, $topic, jsonParse, false);
          },
        [topic, jsonParse, listen, context, constant]
      ),
    };

    // Detect if this table has historical columns (_id, _block_range)
    const hasHistorical = !!codec.attributes._id && !!codec.attributes._block_range;
    // Escape identifiers safely for raw SQL lookup
    const ns = (resource.namespace ?? 'public').replace(/"/g, '""');
    const tbl = codec.name.replace(/"/g, '""');
    const fromIdent = `"${ns}"."${tbl}"`;

    payloadPlans[payloadName] = {
      ...(payloadPlans[payloadName] || {}),
      id: EXPORTABLE((get) => ($event: any) => get($event, 'id'), [get]),
      mutation_type: EXPORTABLE((get) => ($event: any) => get($event, 'mutation_type'), [get]),
      ...(hasHistorical
        ? {
            // Historical tables: use raw SQL lambda to filter by _block_range.
            _entity: {
              plan: EXPORTABLE(
                (get, lambda, context, fromIdent) =>
                  function plan($event: any) {
                    const $pgClient = (context() as any).get('pgClient');
                    return lambda(
                      [get($event, '_entity'), get($event, '_block_height'), $pgClient],
                      async ([entity, blockHeight, pgClient]: any) => {
                        if (!entity) return null;
                        try {
                          if (
                            blockHeight !== null &&
                            blockHeight !== undefined &&
                            entity._id !== null &&
                            entity._id !== undefined
                          ) {
                            const {rows} = await pgClient.query(
                              `SELECT * FROM ${fromIdent} WHERE _id = $1 AND _block_range @> $2::bigint LIMIT 1`,
                              [entity._id, blockHeight]
                            );
                            return rows[0] || null;
                          } else if (entity.id !== null && entity.id !== undefined) {
                            const {rows} = await pgClient.query(`SELECT * FROM ${fromIdent} WHERE id = $1 LIMIT 1`, [
                              entity.id,
                            ]);
                            return rows[0] || null;
                          }
                          return entity;
                        } catch {
                          return entity;
                        }
                      }
                    );
                  },
                [get, lambda, context, fromIdent]
              ),
            },
          }
        : {
            // Normal tables: use resource.get() which returns a PgSelectSingleStep.
            _entity: {
              plan: EXPORTABLE(
                (get, resource) =>
                  function plan($event: any) {
                    const $entity = get($event, '_entity');
                    const $id = get($entity, 'id');
                    return resource.get({id: $id});
                  },
                [get, resource]
              ),
            },
          }),
    };
  }

  return {
    typeDefs,
    resolvers: {},
    objects: {
      ...(Object.keys(subscriptionPlans).length > 0 ? {Subscription: {plans: subscriptionPlans}} : {}),
      ...Object.entries(payloadPlans).reduce((acc: any, [name, plans]) => {
        acc[name] = {plans};
        return acc;
      }, {}),
    },
  };
}, 'PgSubscriptionPlugin');
