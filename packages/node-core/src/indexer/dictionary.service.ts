// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import {ApolloClient, HttpLink, ApolloLink, InMemoryCache, NormalizedCacheObject, gql} from '@apollo/client/core';
import {Injectable, OnApplicationShutdown} from '@nestjs/common';
import {authHttpLink} from '@subql/apollo-links';
import {DictionaryQueryCondition, DictionaryQueryEntry} from '@subql/types';
import {buildQuery, GqlNode, GqlQuery, GqlVar, MetaData} from '@subql/utils';
import fetch from 'node-fetch';
import {NodeConfig} from '../configure';
import {getLogger} from '../logger';
import {profiler} from '../profiler';
import {timeout} from '../utils';

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

export type MetadataDictionary = {
  _metadata: MetaData;
};

const logger = getLogger('dictionary');

const distinctErrorEscaped = `Unknown argument \\"distinct\\"`;
const startHeightEscaped = `Cannot query field \\"startHeight\\"`;

function getGqlType(value: any): string {
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

function buildDictQueryFragment(
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

@Injectable()
export class DictionaryService implements OnApplicationShutdown {
  private _client?: ApolloClient<NormalizedCacheObject>;
  private isShutdown = false;
  private mappedDictionaryQueryEntries: Map<number, DictionaryQueryEntry[]> = new Map();
  private useDistinct = true;
  private useStartHeight = true;
  protected _startHeight?: number;

  constructor(
    readonly dictionaryEndpoint: string | undefined,
    readonly chainId: string,
    protected readonly nodeConfig: NodeConfig,
    protected readonly metadataKeys = ['lastProcessedHeight', 'genesisHash'], // Cosmos uses chain instead of genesisHash
    protected buildQueryFragment: typeof buildDictQueryFragment = buildDictQueryFragment
  ) {}

  async init(): Promise<void> {
    let link: ApolloLink = new HttpLink({uri: this.dictionaryEndpoint, fetch});

    if (this.nodeConfig.dictionaryResolver) {
      try {
        link = await authHttpLink({
          authUrl: this.nodeConfig.dictionaryResolver,
          chainId: this.chainId,
          httpOptions: {fetch},
        });
      } catch (e: any) {
        logger.error(e, 'Failed to resolve network dictionary');
      }
    }

    this._client = new ApolloClient({
      cache: new InMemoryCache({resultCaching: true}),
      link,
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

  private setDictionaryStartHeight(start: number | undefined): void {
    // Since not all dictionary has adopt start height, if it is not set, we just consider it is 1.
    if (this._startHeight !== undefined) {
      return;
    }
    this._startHeight = start ?? 1;
  }

  get startHeight(): number {
    if (!this._startHeight) {
      throw new Error('Dictionary start height is not set');
    }
    return this._startHeight;
  }

  protected get client(): ApolloClient<NormalizedCacheObject> {
    if (!this._client) {
      throw new Error('Dictionary service has not been initialized');
    }
    return this._client;
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

  @profiler()
  async getDictionary(
    startBlock: number,
    queryEndBlock: number,
    batchSize: number,
    conditions: DictionaryQueryEntry[]
  ): Promise<Dictionary | undefined> {
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
    } catch (err: any) {
      // Check if the error is about distinct argument and disable distinct if so
      if (JSON.stringify(err).includes(distinctErrorEscaped)) {
        this.useDistinct = false;
        logger.warn(`Dictionary doesn't support distinct query.`);
        // Rerun the qeury now with distinct disabled
        return this.getDictionary(startBlock, queryEndBlock, batchSize, conditions);
      }
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
        project: this.useStartHeight ? this.metadataKeys : this.metadataKeys.filter((obj) => obj !== 'startHeight'),
      },
    ];
    for (const entity of Object.keys(mapped)) {
      const [pVars, node] = this.buildQueryFragment(
        entity,
        startBlock,
        queryEndBlock,
        mapped[entity],
        batchSize,
        this.useDistinct
      );
      nodes.push(node);
      vars.push(...pVars);
    }
    return buildQuery(vars, nodes);
  }
  buildDictionaryEntryMap<DS extends {startBlock?: number}>(
    dataSources: Array<DS>,
    buildDictionaryQueryEntries: (startBlock: number) => DictionaryQueryEntry[]
  ): void {
    const dsWithStartBlock = (dataSources.filter((ds) => !!ds.startBlock) as (DS & {startBlock: number})[]).sort(
      (a, b) => a.startBlock - b.startBlock
    );
    for (const ds of dsWithStartBlock) {
      this.mappedDictionaryQueryEntries.set(ds.startBlock, buildDictionaryQueryEntries(ds.startBlock));
    }
  }

  getDictionaryQueryEntries(queryEndBlock: number): DictionaryQueryEntry[] {
    let dictionaryQueryEntries: DictionaryQueryEntry[] = [];
    for (const [key, value] of this.mappedDictionaryQueryEntries) {
      if (queryEndBlock >= key) {
        dictionaryQueryEntries = value;
        // Do not return from here, we want loop util we find the LAST mappedDictionaryQueryEntry with startBlock that close to queryEndBlock
      }
    }
    return dictionaryQueryEntries;
  }

  async scopedDictionaryEntries(
    startBlockHeight: number,
    queryEndBlock: number,
    scaledBatchSize: number
  ): Promise<Dictionary | undefined> {
    return this.getDictionary(
      startBlockHeight,
      queryEndBlock,
      scaledBatchSize,
      this.getDictionaryQueryEntries(queryEndBlock)
    );
  }

  private metadataQuery(): GqlQuery {
    const nodes: GqlNode[] = [
      {
        entity: '_metadata',
        project: this.useStartHeight ? [...this.metadataKeys, 'startHeight'] : this.metadataKeys,
      },
    ];
    return buildQuery([], nodes);
  }

  async getMetadata(): Promise<MetadataDictionary | undefined> {
    const {query} = this.metadataQuery();
    try {
      const resp = await timeout(
        this.client.query({
          query: gql(query),
        }),
        this.nodeConfig.dictionaryTimeout
      );
      const _metadata = resp.data._metadata;

      this.setDictionaryStartHeight(_metadata.startHeight);

      return {_metadata};
    } catch (err: any) {
      if (JSON.stringify(err).includes(startHeightEscaped)) {
        this.useStartHeight = false;
        logger.warn(`Dictionary doesn't support validate start height.`);
        // Rerun the qeury now with distinct disabled
        return this.getMetadata();
      }
      logger.error(err, `Failed to get dictionary metadata`);
      return undefined;
    }
  }
}
