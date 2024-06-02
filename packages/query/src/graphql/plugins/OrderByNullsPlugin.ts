import { makeAddPgTableOrderByPlugin, orderByAscDesc } from 'graphile-utils';
import { Build, Plugin } from 'postgraphile';

interface IOrderByNullsPlugin extends Plugin {
  // Define the plugin interface here
}

const OrderByNullsPlugin: IOrderByNullsPlugin = makeAddPgTableOrderByPlugin(
  'public', // Replace with your schema name if different
  'MyTable', // Replace with your table name
  'MY_CUSTOM_ORDER',
  (build: Build) => {
    const { pgSql: sql } = build;
    return {
      ...orderByAscDesc(build), // Spread the existing orderings

      // Custom logic for NULLS LAST
      nullsLast: (queryBuilder) => {
        queryBuilder.orderBy(
          sql.fragment`(${queryBuilder.getTableAlias()}.my_nullable_field) IS NOT NULL`,
          true
        );
      },

      // Custom logic for NULLS FIRST
      nullsFirst: (queryBuilder) => {
        queryBuilder.orderBy(
          sql.fragment`(${queryBuilder.getTableAlias()}.my_nullable_field) IS NULL`,
          true
        );
      }
    };
  }
);

export default OrderByNullsPlugin;
