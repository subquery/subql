// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import {ApolloClient, HttpLink, ApolloLink, InMemoryCache, NormalizedCacheObject, gql} from '@apollo/client/core';
import {Injectable} from '@nestjs/common';
import {EventEmitter2} from '@nestjs/event-emitter';
import {dictHttpLink} from '@subql/apollo-links';
import {NETWORK_FAMILY} from '@subql/common';
import {DictionaryQueryCondition, DictionaryQueryEntry, BaseDataSource} from '@subql/types-core';
import {buildQuery, GqlNode, GqlQuery, GqlVar, MetaData} from '@subql/utils';
import fetch from 'cross-fetch';
import {NodeConfig} from '../configure';
import {IndexerEvent} from '../events';
import {getLogger} from '../logger';
import {profiler} from '../profiler';
import {timeout} from '../utils';
import {BlockHeightMap} from '../utils/blockHeightMap';

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
export class DictionaryService {
  private _client?: ApolloClient<NormalizedCacheObject>;

  queriesMap?: BlockHeightMap<DictionaryQueryEntry[]>;
  private useDistinct = true;
  private useStartHeight = true;
  protected _startHeight?: number;
  protected _genesisHash?: string;

  private metadataValid?: boolean;

  constructor(
    readonly dictionaryEndpoint: string | undefined,
    protected chainId: string,
    protected readonly nodeConfig: NodeConfig,
    private readonly eventEmitter: EventEmitter2,
    protected readonly metadataKeys = ['lastProcessedHeight', 'genesisHash'], // Cosmos uses chain instead of genesisHash
    protected buildQueryFragment: typeof buildDictQueryFragment = buildDictQueryFragment
  ) {
    let link: ApolloLink;

    if (this.nodeConfig.dictionaryResolver) {
      const authHttpLink = dictHttpLink({
        authUrl: this.nodeConfig.dictionaryResolver,
        chainId,
        logger,
        httpOptions: {fetch},
        fallbackServiceUrl: dictionaryEndpoint,
      });
      link = authHttpLink.link;
    } else {
      link = new HttpLink({uri: dictionaryEndpoint, fetch});
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

  protected static async resolveDictionary(
    networkFamily: NETWORK_FAMILY,
    chainId: string,
    registryUrl: string
  ): Promise<string | undefined> {
    try {
      const response = await fetch(registryUrl);

      if (!response.ok) {
        throw new Error(`Bad response, code="${response.status}" body="${await response.text()}"`);
      }
      const dictionaryJson = await response.json();

      const dictionaries = dictionaryJson[networkFamily.toLowerCase()][chainId];

      if (Array.isArray(dictionaries) && dictionaries.length > 0) {
        // TODO choose alternatives
        return dictionaries[0];
      }
    } catch (error: any) {
      logger.error(error, 'An error occurred while fetching the dictionary:');
    }
  }

  get useDictionary(): boolean {
    return (!!this.dictionaryEndpoint || !!this.nodeConfig.dictionaryResolver) && !!this.metadataValid;
  }

  async initValidation(genesisHash: string): Promise<boolean> {
    this._genesisHash = genesisHash;
    const metadata = await this.getMetadata();
    return this.dictionaryValidation(metadata);
  }

  private setDictionaryStartHeight(start: number | undefined): void {
    // Since not all dictionary has adopted start height, if it is not set, we just consider it is 1.
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

  get apiGenesisHash(): string {
    assert(this._genesisHash, new Error('Endpoint genesis hash is not set in dictionary'));
    return this._genesisHash;
  }

  protected get client(): ApolloClient<NormalizedCacheObject> {
    if (!this._client) {
      throw new Error('Dictionary service has not been initialized');
    }
    return this._client;
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
    conditions?: DictionaryQueryEntry[]
  ): Promise<Dictionary | undefined> {
    if (!conditions) {
      return undefined;
    }

    const {query, variables} = this.dictionaryQuery(startBlock, queryEndBlock, batchSize, conditions);

    logger.debug(`query: ${query}`);
    logger.debug(`variables: ${JSON.stringify(variables, null, 2)}`);
    try {
      const resp = await timeout(
        this.client.query({
          query: gql(query),
          variables,
        }),
        this.nodeConfig.dictionaryTimeout,
        `Dictionary query timeout in ${
          this.nodeConfig.dictionaryTimeout
        } seconds. Please increase --dictionary-timeout. ${
          this.nodeConfig.debug ? `\n GraphQL: ${query}, \n Variables: ${variables}` : ''
        }`
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

      if (!this.dictionaryValidation(_metadata, startBlock)) {
        return undefined;
      }

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

  buildDictionaryEntryMap<DS extends BaseDataSource>(
    dataSources: BlockHeightMap<DS[]>,
    buildDictionaryQueryEntries: (dataSources: DS[]) => DictionaryQueryEntry[]
  ): void {
    this.queriesMap = dataSources.map(buildDictionaryQueryEntries);
  }

  async scopedDictionaryEntries(
    startBlockHeight: number,
    queryEndBlock: number,
    scaledBatchSize: number
  ): Promise<(Dictionary & {queryEndBlock: number}) | undefined> {
    const queryDetails = this.queriesMap?.getDetails(startBlockHeight);
    const queryEntry: DictionaryQueryEntry[] = queryDetails?.value ?? [];

    queryEndBlock =
      queryDetails?.endHeight && queryDetails?.endHeight < queryEndBlock ? queryDetails.endHeight : queryEndBlock;

    const dict = await this.getDictionary(startBlockHeight, queryEndBlock, scaledBatchSize, queryEntry);

    // Check undefined
    if (!dict) return undefined;

    // Reutrn the queryEndBlock to know if the scoped entry changed it.
    return {
      ...dict,
      queryEndBlock,
    };
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

  private async getMetadata(): Promise<MetaData | undefined> {
    const {query} = this.metadataQuery();
    try {
      const resp = await timeout(
        this.client.query({
          query: gql(query),
        }),
        this.nodeConfig.dictionaryTimeout,
        `Dictionary metadata query timeout in ${
          this.nodeConfig.dictionaryTimeout
        } seconds. Please increase --dictionary-timeout. ${this.nodeConfig.debug ? `\n GraphQL: ${query}` : ''}`
      );
      const _metadata = resp.data._metadata;

      this.setDictionaryStartHeight(_metadata.startHeight);

      return _metadata;
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

  // Base validation is required, and specific validation for each network should be implemented accordingly
  protected validateChainMeta(metaData: MetaData): boolean {
    return (
      metaData.chain === this.chainId ||
      metaData.genesisHash === this.chainId ||
      this.apiGenesisHash === metaData.genesisHash
    );
  }

  private dictionaryValidation(metaData?: MetaData, startBlockHeight?: number): boolean {
    const validate = (): boolean => {
      try {
        if (!metaData) {
          return false;
        }
        // Some dictionaries rely on chain others rely on genesisHash
        if (!this.validateChainMeta(metaData)) {
          logger.error(
            'The dictionary that you have specified does not match the chain you are indexing, it will be ignored. Please update your project manifest to reference the correct dictionary'
          );
          return false;
        }

        if (startBlockHeight !== undefined && metaData.lastProcessedHeight < startBlockHeight) {
          logger.warn(`Dictionary indexed block is behind current indexing block height`);
          return false;
        }
        return true;
      } catch (e: any) {
        logger.error(e, 'Unable to validate dictionary metadata');
        return false;
      }
    };

    const valid = validate();

    this.metadataValid = valid;
    this.eventEmitter.emit(IndexerEvent.UsingDictionary, {
      value: Number(this.useDictionary),
    });
    this.eventEmitter.emit(IndexerEvent.SkipDictionary);

    return valid;
  }
}
