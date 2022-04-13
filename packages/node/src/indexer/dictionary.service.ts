// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {
  ApolloClient,
  HttpLink,
  InMemoryCache,
  NormalizedCacheObject,
  gql,
} from '@apollo/client/core';
import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { buildQuery, GqlNode, GqlQuery, GqlVar, MetaData } from '@subql/common';
import { DictionaryQueryCondition, DictionaryQueryEntry } from '@subql/types';
import fetch from 'node-fetch';
import { SubqueryProject } from '../configure/SubqueryProject';
import { getLogger } from '../utils/logger';
import { profiler } from '../utils/profiler';
import { getYargsOption } from '../yargs';
import { SpecVersionMap } from './SpecVersions.service';

export type Dictionary = {
  _metadata: MetaData;
  batchBlocks: number[];
  specVersions: SpecVersionMap;
};
const logger = getLogger('dictionary');
const { argv } = getYargsOption();

function extractVar(name: string, cond: DictionaryQueryCondition): GqlVar {
  return {
    name,
    gqlType: 'String!',
    value: cond.value,
  };
}

const ARG_FIELD_REGX = /[^a-zA-Z0-9-_]/g;
function sanitizeArgField(input: string): string {
  return input.replace(ARG_FIELD_REGX, '');
}

function extractVars(
  entity: string,
  conditions: DictionaryQueryCondition[][],
): [GqlVar[], Record<string, unknown>] {
  const gqlVars: GqlVar[] = [];
  const filter = { or: [] };
  conditions.forEach((i, outerIdx) => {
    if (i.length > 1) {
      filter.or[outerIdx] = {
        and: i.map((j, innerIdx) => {
          const v = extractVar(`${entity}_${outerIdx}_${innerIdx}`, j);
          gqlVars.push(v);
          return { [sanitizeArgField(j.field)]: { equalTo: `$${v.name}` } };
        }),
      };
    } else if (i.length === 1) {
      const v = extractVar(`${entity}_${outerIdx}_0`, i[0]);
      gqlVars.push(v);
      filter.or[outerIdx] = {
        [sanitizeArgField(i[0].field)]: { equalTo: `$${v.name}` },
      };
    }
  });
  return [gqlVars, filter];
}

function buildDictQueryFragment(
  entity: string,
  startBlock: number,
  queryEndBlock: number,
  conditions: DictionaryQueryCondition[][],
  batchSize: number,
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
  return [gqlVars, node];
}

@Injectable()
export class DictionaryService implements OnApplicationShutdown {
  private client: ApolloClient<NormalizedCacheObject>;
  private isShutdown = false;

  constructor(protected project: SubqueryProject) {
    this.client = new ApolloClient({
      cache: new InMemoryCache({ resultCaching: true }),
      link: new HttpLink({ uri: this.project.network.dictionary, fetch }),
      defaultOptions: {
        watchQuery: {
          fetchPolicy: 'no-cache',
        },
        query: {
          fetchPolicy: 'no-cache',
        },
      },
    });
  }

  onApplicationShutdown(): void {
    this.isShutdown = true;
  }

  /**
   *
   * @param startBlock
   * @param queryEndBlock this block number will limit the max query range, increase dictionary query speed
   * @param lastSpecVersionBlock this is the last block we have a known spec version for
   * @param batchSize
   * @param conditions
   */

  @profiler(argv.profiler)
  async getDictionary(
    startBlock: number,
    queryEndBlock: number,
    lastSpecVersionBlock: number,
    batchSize: number,
    conditions: DictionaryQueryEntry[],
  ): Promise<Dictionary> {
    const { query, variables } = this.dictionaryQuery(
      startBlock,
      queryEndBlock,
      lastSpecVersionBlock,
      batchSize,
      conditions,
    );

    // logger.warn(`DICT QUERY ${query}, ${JSON.stringify(variables)}`)

    try {
      const resp = await this.client.query({
        query: gql(query),
        variables,
      });
      const blockHeightSet = new Set<number>();
      const specVersions: SpecVersionMap = {};
      const entityEndBlock: { [entity: string]: number } = {};
      for (const entity of Object.keys(resp.data)) {
        if (
          entity !== 'specVersions' &&
          entity !== '_metadata' &&
          resp.data[entity].nodes.length >= 0
        ) {
          for (const node of resp.data[entity].nodes) {
            blockHeightSet.add(Number(node.blockHeight));
            entityEndBlock[entity] = Number(node.blockHeight); //last added event blockHeight
          }
        }
      }
      if (resp.data.specVersions && resp.data.specVersions.nodes.length >= 0) {
        for (const node of resp.data.specVersions.nodes) {
          specVersions[node.blockHeight] = node.id;
        }
      }
      const _metadata = resp.data._metadata;
      const endBlock = Math.min(
        ...Object.values(entityEndBlock).map((height) =>
          isNaN(height) ? Infinity : height,
        ),
      );
      const batchBlocks = Array.from(blockHeightSet)
        .filter((block) => block <= endBlock)
        .sort((n1, n2) => n1 - n2);

      // const specVersions = Array.from(specVersionBlockHeightSet);
      return {
        _metadata,
        batchBlocks,
        specVersions,
      };
    } catch (err) {
      logger.warn(err, `failed to fetch dictionary result`);
      return undefined;
    }
  }

  private dictionaryQuery(
    startBlock: number,
    queryEndBlock: number,
    lastSpecVersionBlock: number,
    batchSize: number,
    conditions: DictionaryQueryEntry[],
  ): GqlQuery {
    // 1. group condition by entity
    const mapped: Record<string, DictionaryQueryCondition[][]> =
      conditions.reduce((acc, c) => {
        acc[c.entity] = acc[c.entity] || [];
        acc[c.entity].push(c.conditions);
        return acc;
      }, {});

    // assemble
    const vars: GqlVar[] = [];
    const nodes: GqlNode[] = [
      {
        entity: '_metadata',
        project: ['lastProcessedHeight', 'genesisHash'],
      },
      {
        entity: 'specVersions',
        project: [
          {
            entity: 'nodes',
            project: ['id', 'blockHeight'],
          },
        ],
        args: {
          filter: {
            blockHeight: {
              greaterThanEqualTo: `${lastSpecVersionBlock}`,
            },
          },
          last: batchSize,
          orderBy: 'BLOCK_HEIGHT_ASC',
        },
      },
    ];
    for (const entity of Object.keys(mapped)) {
      const [pVars, node] = buildDictQueryFragment(
        entity,
        startBlock,
        queryEndBlock,
        mapped[entity],
        batchSize,
      );
      nodes.push(node);
      vars.push(...pVars);
    }
    return buildQuery(vars, nodes);
  }
}
