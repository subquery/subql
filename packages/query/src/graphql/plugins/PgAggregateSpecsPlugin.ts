// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

// overwrite the official plugin: https://github.com/graphile/pg-aggregates/blob/main/src/AggregateSpecsPlugin.ts
// Fixed the aggregate query, type conversion causes precision loss.

const TIMESTAMP_OID = '1114';
const TIMESTAMPTZ_OID = '1184';
const SMALLINT_OID = '21';
const BIGINT_OID = '20';
const INTEGER_OID = '23';
const NUMERIC_OID = '1700';
const REAL_OID = '700';
const DOUBLE_PRECISION_OID = '701';
const INTERVAL_OID = '1186';
const MONEY_OID = '790';
const AggregateSpecsPlugin = (builder) => {
  builder.hook('build', (build) => {
    const {pgSql: sql} = build;
    const isNumberLike = (pgType) => pgType.category === 'N';
    /** Maps from the data type of the column to the data type of the sum aggregate */
    /** BigFloat is our fallback type; it should be valid for almost all numeric types */
    const convertWithMapAndFallback = (dataTypeToAggregateTypeMap, fallback) => {
      return (pgType, _pgTypeModifier) => {
        const targetTypeId = dataTypeToAggregateTypeMap[pgType.id] || fallback;
        const targetType = build.pgIntrospectionResultsByKind.type.find((t) => t.id === targetTypeId);
        if (!targetType) {
          throw new Error(`Could not find PostgreSQL type with oid '${targetTypeId}' whilst processing aggregate.`);
        }
        return [targetType, null];
      };
    };
    const pgAggregateSpecs = [
      {
        id: 'sum',
        humanLabel: 'sum',
        HumanLabel: 'Sum',
        isSuitableType: isNumberLike,
        // I've wrapped it in `coalesce` so that it cannot be null
        // Subql fix: The ::text cast is to ensure that the result is a string, which is
        sqlAggregateWrap: (sqlFrag) => sql.fragment`coalesce(sum(${sqlFrag}), 0)::text`,
        isNonNull: true,
        // A SUM(...) often ends up significantly larger than any individual
        // value; see
        // https://www.postgresql.org/docs/current/functions-aggregate.html for
        // how the sum aggregate changes result type.
        pgTypeAndModifierModifier: convertWithMapAndFallback(
          {
            [SMALLINT_OID]: BIGINT_OID,
            [INTEGER_OID]: BIGINT_OID,
            [BIGINT_OID]: NUMERIC_OID,
            [REAL_OID]: REAL_OID,
            [DOUBLE_PRECISION_OID]: DOUBLE_PRECISION_OID,
            [INTERVAL_OID]: INTERVAL_OID,
            [MONEY_OID]: MONEY_OID,
          },
          NUMERIC_OID /* numeric */
        ),
      },
      {
        id: 'distinctCount',
        humanLabel: 'distinct count',
        HumanLabel: 'Distinct count',
        isSuitableType: () => true,
        sqlAggregateWrap: (sqlFrag) => sql.fragment`count(distinct ${sqlFrag})`,
        pgTypeAndModifierModifier: convertWithMapAndFallback({}, BIGINT_OID /* always use bigint */),
      },
      {
        id: 'min',
        humanLabel: 'minimum',
        HumanLabel: 'Minimum',
        isSuitableType: isNumberLike,
        // Subql fix: The ::text cast is to ensure that the result is a string, which is
        sqlAggregateWrap: (sqlFrag) => sql.fragment`min(${sqlFrag})::text`,
      },
      {
        id: 'max',
        humanLabel: 'maximum',
        HumanLabel: 'Maximum',
        isSuitableType: isNumberLike,
        // Subql fix: The ::text cast is to ensure that the result is a string, which is
        sqlAggregateWrap: (sqlFrag) => sql.fragment`max(${sqlFrag})::text`,
      },
      {
        id: 'average',
        humanLabel: 'mean average',
        HumanLabel: 'Mean average',
        isSuitableType: isNumberLike,
        // Subql fix: The ::text cast is to ensure that the result is a string, which is
        sqlAggregateWrap: (sqlFrag) => sql.fragment`avg(${sqlFrag})::text`,
        // An AVG(...) ends up more precise than any individual value; see
        // https://www.postgresql.org/docs/current/functions-aggregate.html for
        // how the avg aggregate changes result type.
        pgTypeAndModifierModifier: convertWithMapAndFallback(
          {
            [SMALLINT_OID]: NUMERIC_OID,
            [INTEGER_OID]: NUMERIC_OID,
            [BIGINT_OID]: NUMERIC_OID,
            [NUMERIC_OID]: NUMERIC_OID,
            [REAL_OID]: DOUBLE_PRECISION_OID,
            [DOUBLE_PRECISION_OID]: DOUBLE_PRECISION_OID,
            [INTERVAL_OID]: INTERVAL_OID,
          },
          '1700' /* numeric */
        ),
      },
      {
        id: 'stddevSample',
        humanLabel: 'sample standard deviation',
        HumanLabel: 'Sample standard deviation',
        isSuitableType: isNumberLike,
        sqlAggregateWrap: (sqlFrag) => sql.fragment`stddev_samp(${sqlFrag})`,
        // See https://www.postgresql.org/docs/current/functions-aggregate.html
        // for how this aggregate changes result type.
        pgTypeAndModifierModifier: convertWithMapAndFallback(
          {
            [REAL_OID]: DOUBLE_PRECISION_OID,
            [DOUBLE_PRECISION_OID]: DOUBLE_PRECISION_OID,
          },
          NUMERIC_OID /* numeric */
        ),
      },
      {
        id: 'stddevPopulation',
        humanLabel: 'population standard deviation',
        HumanLabel: 'Population standard deviation',
        isSuitableType: isNumberLike,
        sqlAggregateWrap: (sqlFrag) => sql.fragment`stddev_pop(${sqlFrag})`,
        // See https://www.postgresql.org/docs/current/functions-aggregate.html
        // for how this aggregate changes result type.
        pgTypeAndModifierModifier: convertWithMapAndFallback(
          {
            [REAL_OID]: DOUBLE_PRECISION_OID,
            [DOUBLE_PRECISION_OID]: DOUBLE_PRECISION_OID,
          },
          NUMERIC_OID /* numeric */
        ),
      },
      {
        id: 'varianceSample',
        humanLabel: 'sample variance',
        HumanLabel: 'Sample variance',
        isSuitableType: isNumberLike,
        sqlAggregateWrap: (sqlFrag) => sql.fragment`var_samp(${sqlFrag})`,
        // See https://www.postgresql.org/docs/current/functions-aggregate.html
        // for how this aggregate changes result type.
        pgTypeAndModifierModifier: convertWithMapAndFallback(
          {
            [REAL_OID]: DOUBLE_PRECISION_OID,
            [DOUBLE_PRECISION_OID]: DOUBLE_PRECISION_OID,
          },
          NUMERIC_OID /* numeric */
        ),
      },
      {
        id: 'variancePopulation',
        humanLabel: 'population variance',
        HumanLabel: 'Population variance',
        isSuitableType: isNumberLike,
        sqlAggregateWrap: (sqlFrag) => sql.fragment`var_pop(${sqlFrag})`,
        // See https://www.postgresql.org/docs/current/functions-aggregate.html
        // for how this aggregate changes result type.
        pgTypeAndModifierModifier: convertWithMapAndFallback(
          {
            [REAL_OID]: DOUBLE_PRECISION_OID,
            [DOUBLE_PRECISION_OID]: DOUBLE_PRECISION_OID,
          },
          NUMERIC_OID /* numeric */
        ),
      },
    ];
    const pgAggregateGroupBySpecs = [
      {
        id: 'truncated-to-hour',
        isSuitableType: (pgType) =>
          /* timestamp or timestamptz */
          pgType.id === TIMESTAMP_OID || pgType.id === TIMESTAMPTZ_OID,
        sqlWrap: (sqlFrag) => sql.fragment`date_trunc('hour', ${sqlFrag})`,
      },
      {
        id: 'truncated-to-day',
        isSuitableType: (pgType) =>
          /* timestamp or timestamptz */
          pgType.id === TIMESTAMP_OID || pgType.id === TIMESTAMPTZ_OID,
        sqlWrap: (sqlFrag) => sql.fragment`date_trunc('day', ${sqlFrag})`,
      },
    ];
    return build.extend(build, {
      pgAggregateSpecs,
      pgAggregateGroupBySpecs,
    });
  });
};
export default AggregateSpecsPlugin;
//# sourceMappingURL=AggregateSpecsPlugin.js.map
