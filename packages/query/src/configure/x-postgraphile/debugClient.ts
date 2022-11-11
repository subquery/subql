// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

// overwrite the method plugin: https://github.com/graphile/postgraphile/blob/263ba7477bc2133eebdf89d29acd0460e58501ec/src/postgraphile/withPostGraphileContext.ts#L473
// Allow log SQL queries without resolve result
import {PoolClient} from 'pg';
import Pino from 'pino';

const $$pgClientOrigQuery = Symbol();

declare module 'pg' {
  interface ClientBase {
    _explainResults: Array<RawExplainResult> | null;
    startExplain: () => void;
    stopExplain: () => Promise<Array<ExplainResult>>;
  }
}

interface RawExplainResult {
  query: string;
  values: any[];
  result: any;
}
type ExplainResult = Omit<RawExplainResult, 'result'> & {
  plan: string;
};

export function debugPgClient(pgClient: PoolClient, logger: Pino.Logger): PoolClient {
  // If Postgres debugging is enabled, enhance our query function by adding
  // a debug statement.
  if (!pgClient[$$pgClientOrigQuery]) {
    // Set the original query method to a key on our client. If that key is
    // already set, use that.
    pgClient[$$pgClientOrigQuery] = pgClient.query;

    pgClient.startExplain = () => {
      pgClient._explainResults = [];
    };

    pgClient.stopExplain = async () => {
      const results = pgClient._explainResults;
      pgClient._explainResults = null;
      if (!results) {
        return Promise.resolve([]);
      }
      return (
        await Promise.all(
          results.map(async (r) => {
            const {result: resultPromise, ...rest} = r;
            const result = await resultPromise;
            const firstKey = result && result[0] && Object.keys(result[0])[0];
            if (!firstKey) {
              return null;
            }
            const plan = result.map((r: any) => r[firstKey]).join('\n');
            return {
              ...rest,
              plan,
            };
          })
        )
      ).filter((entry: unknown): entry is ExplainResult => !!entry);
    };

    pgClient.query = function (...args: Array<any>): any {
      const [a, b, c] = args;
      const variables: string[] = [];
      // If we understand it (and it uses the promises API)
      if (
        (typeof a === 'string' && (!c || typeof c === 'function') && (!b || Array.isArray(b))) ||
        (typeof a === 'object' && !b && !c)
      ) {
        if (pgClient._explainResults) {
          const query = a && a.text ? a.text : a;
          const values = a && a.text ? a.values : b;
          if (query.match(/^\s*(select|insert|update|delete|with)\s/i) && !query.includes(';')) {
            // Explain it
            const explain = `explain ${query}`;
            pgClient._explainResults.push({
              query,
              values,
              result: pgClient[$$pgClientOrigQuery]
                .call(this, explain, values)
                .then((data: any) => data.rows)
                // swallow errors during explain
                .catch(() => null),
            });
          }
        }
        pgClient._explainResults.forEach(({query, values}: {query: string; values?: any[]}) => {
          let res: string;
          res = `\n Query: ${query} `;
          if (values && values.length !== 0) {
            res = res.concat(` \n Values: ${JSON.stringify(values)}`);
          }
          logger.info(res);
        });

        return pgClient[$$pgClientOrigQuery].apply(this, args);
      } else {
        // We don't understand it (e.g. `pgPool.query`), just let it happen.
        logger.info(`Having trouble to understand query args`);
        args.forEach((arg) => {
          logger.info(`arg: ${arg}`);
        });
        return pgClient[$$pgClientOrigQuery].apply(this, args);
      }
    };
  }

  return pgClient;
}
