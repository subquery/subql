// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import {DictionaryQueryCondition} from '@subql/types-core';
import {GqlNode, GqlVar, MetaData as DictionaryV1Metadata} from '@subql/utils';

export const distinctErrorEscaped = `Unknown argument \\"distinct\\"`;
export const startHeightEscaped = `Cannot query field \\"startHeight\\"`;

export type SpecVersion = {
  id: string;
  start: number; //start with this block
  end: number;
};

export type SpecVersionDictionary = {
  _metadata: DictionaryV1Metadata;
  specVersions: SpecVersion[];
};

export type MetadataDictionary = {
  _metadata: DictionaryV1Metadata;
};

export function getGqlType(value: any): string {
  switch (typeof value) {
    case 'number':
      return 'BigFloat!';
    case 'boolean':
      return 'Boolean!';
    case 'object': {
      if (Array.isArray(value)) {
        if (!value.length) {
          throw new Error('Unable to determine array type');
        }

        // Use the first value to get the type, assume they are all the same type
        return `[${getGqlType(value[0])}]`;
      } else {
        throw new Error('Object types not supported');
      }
    }
    default:
    case 'string':
      return 'String!';
  }
}

function extractVar(name: string, cond: DictionaryQueryCondition): GqlVar {
  const gqlType = cond.matcher === 'contains' ? 'JSON' : getGqlType(cond.value);

  return {
    name,
    gqlType,
    value: cond.value,
  };
}

const ARG_FIELD_REGX = /[^a-zA-Z0-9-_]/g;
function sanitizeArgField(input: string): string {
  return input.replace(ARG_FIELD_REGX, '');
}

type Filter = {or: any[]};

function extractVars(entity: string, conditions: DictionaryQueryCondition[][]): [GqlVar[], Filter] {
  const gqlVars: GqlVar[] = [];
  const filter: Filter = {or: []};
  conditions.forEach((i, outerIdx) => {
    if (i.length > 1) {
      filter.or[outerIdx] = {
        and: i.map((j, innerIdx) => {
          const v = extractVar(`${entity}_${outerIdx}_${innerIdx}`, j);
          gqlVars.push(v);
          return {
            [sanitizeArgField(j.field)]: {
              [j.matcher || 'equalTo']: `$${v.name}`,
            },
          };
        }),
      };
    } else if (i.length === 1) {
      const v = extractVar(`${entity}_${outerIdx}_0`, i[0]);
      gqlVars.push(v);
      filter.or[outerIdx] = {
        [sanitizeArgField(i[0].field)]: {
          [i[0].matcher || 'equalTo']: `$${v.name}`,
        },
      };
    }
  });
  return [gqlVars, filter];
}

export function buildDictQueryFragment(
  entity: string,
  startBlock: number,
  queryEndBlock: number,
  conditions: DictionaryQueryCondition[][],
  batchSize: number,
  useDistinct: boolean
): [GqlVar[], GqlNode] {
  const [gqlVars, filter] = extractVars(entity, conditions);

  const node: GqlNode = {
    entity,
    project: [
      {
        entity: 'nodes',
        project: ['blockHeight'],
      },
    ],
    args: {
      filter: {
        ...filter,
        blockHeight: {
          greaterThanOrEqualTo: `"${startBlock}"`,
          lessThan: `"${queryEndBlock}"`,
        },
      },
      orderBy: 'BLOCK_HEIGHT_ASC',
      first: batchSize.toString(),
    },
  };

  if (useDistinct) {
    // Non null assertion here because we define the object explicitly
    assert(node.args, 'Args should be defined in the above definition of node');
    node.args.distinct = ['BLOCK_HEIGHT'];
  }

  return [gqlVars, node];
}
