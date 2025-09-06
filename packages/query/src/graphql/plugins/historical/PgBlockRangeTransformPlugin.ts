// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Plugin} from 'graphile-build';

export const PgBlockRangeTransformPlugin: Plugin = (builder) => {
  builder.hook(
    'GraphQLObjectType:fields:field',
    (field, {pgSql: sql}, {scope}) => {
      // Only apply to root query fields for entities (not nested fields)
      if (!field.resolve || !scope.isPgFieldConnection) {
        return field;
      }

      const originalResolve = field.resolve;

      return {
        ...field,
        resolve: async (source: any, args: any, context: any, info: any) => {
          const result = await originalResolve(source, args, context, info);

          // Check if this is a block range query
          const isBlockRangeQuery = Boolean(args.blockRange);

          if (isBlockRangeQuery && result && result.nodes && Array.isArray(result.nodes)) {
            // Transform the nodes array into block-height-keyed object
            const groupedByBlock: {[blockHeight: string]: any} = {};

            result.nodes.forEach((node: any) => {
              if (node.__block_height !== undefined && node.__block_height !== null) {
                const blockHeight = node.__block_height.toString();
                const {__block_height, ...entityData} = node;

                // Check if this represents valid entity data or a deletion
                const nonIdFields = Object.entries(entityData).filter(
                  ([key]) => key !== 'id' && key !== '__identifiers'
                );
                const hasData = nonIdFields.some(([, value]) => value !== null);

                groupedByBlock[blockHeight] = hasData ? entityData : null;
              }
            });

            // Return the block-height-keyed object directly (bypassing GraphQL connection structure)
            return groupedByBlock;
          }

          return result;
        },
      };
    },
    ['BlockRangeTransform']
  );
};
