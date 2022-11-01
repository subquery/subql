// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {ApolloClient, HttpLink, InMemoryCache, NormalizedCacheObject, gql} from '@apollo/client/core';
import {Injectable, OnApplicationShutdown} from '@nestjs/common';
import {NodeConfig, timeout, getLogger, profiler} from '@subql/node-core';
import {DictionaryQueryCondition, DictionaryQueryEntry} from '@subql/types';
import {buildQuery, GqlNode, GqlQuery, GqlVar, MetaData} from '@subql/utils';
import fetch from 'node-fetch';
// import { yargsOptions } from '../yargs';

export type SpecVersion = {
  id: string;
  start: number; //start with this block
  end: number;
};

export type Dictionary = {
  _metadata: MetaData;
  batchBlocks: number[];
};

export type SpecVersionDictionary = {
  _metadata: MetaData;
  specVersions: SpecVersion[];
};

const logger = getLogger('dictionary');

function extractVar(name: string, cond: DictionaryQueryCondition): GqlVar {
  let gqlType: string;
  switch (typeof cond.value) {
    case 'number':
      gqlType = 'BigFloat!';
      break;
    case 'boolean':
      gqlType = 'Boolean!';
      break;
    default:
    case 'string':
      gqlType = 'String!';
      break;
  }

  if (cond.matcher === 'contains') {
    gqlType = 'JSON';
  }

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
            // Use case insensitive here due to go-dictionary generate name is in lower cases
            // Origin dictionary still using camelCase
            [sanitizeArgField(j.field)]: {
              [j.matcher || 'equalToInsensitive']: `$${v.name}`,
            },
          };
        }),
      };
    } else if (i.length === 1) {
      const v = extractVar(`${entity}_${outerIdx}_0`, i[0]);
      gqlVars.push(v);
      filter.or[outerIdx] = {
        [sanitizeArgField(i[0].field)]: {
          [i[0].matcher || 'equalToInsensitive']: `$${v.name}`,
        },
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
  batchSize: number
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
  protected client: ApolloClient<NormalizedCacheObject>;
  private isShutdown = false;
  private mappedDictionaryQueryEntries: Map<number, DictionaryQueryEntry[]>;

  constructor(
    readonly dictionaryEndpoint: string,
    protected readonly nodeConfig: NodeConfig,
    protected readonly metadataKeys = ['lastProcessedHeight', 'genesisHash'] // Cosmos uses chain instead of genesisHash
  ) {
    this.client = new ApolloClient({
      cache: new InMemoryCache({resultCaching: true}),
      link: new HttpLink({uri: dictionaryEndpoint, fetch}),
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
   * @param batchSize
   * @param conditions
   */

  @profiler(/*yargsOptions.argv.profiler*/)
  async getDictionary(
    startBlock: number,
    queryEndBlock: number,
    batchSize: number,
    conditions: DictionaryQueryEntry[]
  ): Promise<Dictionary> {
    const {query, variables} = this.dictionaryQuery(startBlock, queryEndBlock, batchSize, conditions);

    try {
      const resp = await timeout(
        this.client.query({
          query: gql(query),
          variables,
        }),
        this.nodeConfig.dictionaryTimeout
      );
      const blockHeightSet = new Set<number>();
      const entityEndBlock: {[entity: string]: number} = {};
      for (const entity of Object.keys(resp.data)) {
        if (entity !== '_metadata' && resp.data[entity].nodes.length >= 0) {
          for (const node of resp.data[entity].nodes) {
            blockHeightSet.add(Number(node.blockHeight));
            entityEndBlock[entity] = Number(node.blockHeight); //last added event blockHeight
          }
        }
      }
      const _metadata = resp.data._metadata;
      const endBlock = Math.min(...Object.values(entityEndBlock).map((height) => (isNaN(height) ? Infinity : height)));
      const batchBlocks = Array.from(blockHeightSet)
        .filter((block) => block <= endBlock)
        .sort((n1, n2) => n1 - n2);
      return {
        _metadata,
        batchBlocks,
      };
    } catch (err) {
      logger.warn(err, `failed to fetch dictionary result`);
      return undefined;
    }
  }

  private dictionaryQuery(
    startBlock: number,
    queryEndBlock: number,
    batchSize: number,
    conditions: DictionaryQueryEntry[]
  ): GqlQuery {
    const mapped = conditions.reduce<Record<string, DictionaryQueryCondition[][]>>((acc, c) => {
      acc[c.entity] = acc[c.entity] || [];
      acc[c.entity].push(c.conditions);
      return acc;
    }, {});

    // assemble
    const vars: GqlVar[] = [];
    const nodes: GqlNode[] = [
      {
        entity: '_metadata',
        project: this.metadataKeys,
      },
    ];
    for (const entity of Object.keys(mapped)) {
      const [pVars, node] = buildDictQueryFragment(entity, startBlock, queryEndBlock, mapped[entity], batchSize);
      nodes.push(node);
      vars.push(...pVars);
    }
    return buildQuery(vars, nodes);
  }
  buildDictionaryEntryMap(
    // dataSources: { startBlock: number }[],
    // TODO: change type later
    dataSources: any[],
    buildDictionaryQueryEntries: (startBlock: number) => DictionaryQueryEntry[]
  ): void {
    const mappedDictionaryQueryEntries = new Map();

    for (const ds of dataSources) {
      mappedDictionaryQueryEntries.set(ds.startBlock, buildDictionaryQueryEntries(ds.startBlock));
    }
    // sort map from lowest ds.startBlock to highest
    this.mappedDictionaryQueryEntries = new Map([...mappedDictionaryQueryEntries.entries()].sort());
    console.log('Set dictionaryQuery Map', this.mappedDictionaryQueryEntries);
  }

  getDictionaryQueryEntries(endBlockHeight: number): DictionaryQueryEntry[] {
    let dictionaryQueryEntries: DictionaryQueryEntry[];
    this.mappedDictionaryQueryEntries.forEach((value, key) => {
      if (endBlockHeight >= key) {
        dictionaryQueryEntries = value;
      }
    });

    if (dictionaryQueryEntries === undefined) {
      return [];
    }

    return dictionaryQueryEntries;
  }

  async scopedDictionaryEntries(
    startBlockHeight: number,
    endBlockHeight: number,
    queryEndBlock: number,
    scaledBatchSize: number
  ): Promise<Dictionary> {
    return this.getDictionary(
      startBlockHeight,
      queryEndBlock,
      scaledBatchSize,
      this.getDictionaryQueryEntries(endBlockHeight)
    );
  }
}
