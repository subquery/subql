import { Plugin } from 'graphile-build';
import { QueryBuilder } from '@subql/x-graphile-build-pg';

export const PgTotalCountPlugin: Plugin = (builder) => {
  builder.hook('GraphQLObjectType:fields:field:args', (args, build, context) => {
    const {
      extend,
      graphql: { GraphQLBoolean },
    } = build;
    const { scope: { isPgConnectionField } } = context;

    if (!isPgConnectionField) {
      return args;
    }

    return extend(args, {
      includeTotalCount: {
        description: 'Include the total count of entities',
        type: GraphQLBoolean,
      },
    });
  });

  builder.hook('GraphQLObjectType:fields:field', (field, build, context) => {
    const {
      extend,
    } = build;
    const {
      scope: { isPgConnectionField, pgFieldIntrospection },
      addDataGenerator,
      Self,
    } = context;

    if (!isPgConnectionField || !pgFieldIntrospection) {
      return field;
    }

    addDataGenerator(({ includeTotalCount }) => {
      if (!includeTotalCount) {
        return {};
      }
      return {
        pgQuery: (queryBuilder: QueryBuilder) => {
          queryBuilder.select(() => {
            const tableAlias = queryBuilder.getTableAlias();
            return `COUNT(${tableAlias}.*) OVER() AS total_count`;
          });
        },
      };
    });

    return extend(field, {
      type: Self,
      resolve(data, _args, _context, resolveInfo) {
        const totalCount = data.total_count;
        return {
          ...data,
          totalCount,
        };
      },
    });
  });

  builder.hook('GraphQLObjectType:fields', (fields, build, context) => {
    const {
      extend,
      graphql: { GraphQLInt },
    } = build;
    const {
      scope: { isPgConnectionType },
    } = context;

    if (!isPgConnectionType) {
      return fields;
    }

    return extend(fields, {
      totalCount: {
        description: 'The total count of entities',
        type: GraphQLInt,
        resolve(connection) {
          return connection.totalCount;
        },
      },
    });
  });
};