// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {DictionaryQueryCondition, DictionaryQueryEntry as DictionaryV1QueryEntry} from '@subql/types-core';
import {buildQuery, GqlNode, GqlQuery, GqlVar, MetaData as DictionaryV1Metadata} from '@subql/utils';
import {NodeConfig} from '../../../configure';
import {getLogger} from '../../../logger';
import {profiler} from '../../../profiler';
import {timeout} from '../../../utils';
import {CoreDictionary} from '../coreDictionary';
import {DictionaryResponse} from '../types';
import {buildDictQueryFragment, distinctErrorEscaped, startHeightEscaped} from './utils';

const logger = getLogger('dictionary-v1');

type GraphQLError = {message: string; [key: string]: unknown};

/** A `getData` query's result: the dictionary's metadata, and each queried entity's matching block heights. */
type DictionaryV1BatchResult = {_metadata: DictionaryV1Metadata} & Record<string, {nodes: {blockHeight: string}[]}>;

/**
 * A dictionary query that failed. `graphQLErrors` holds the errors the dictionary returned, if any,
 * which callers inspect to tell an unsupported argument from a failed request.
 */
export class DictionaryQueryError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly graphQLErrors: GraphQLError[] = []
  ) {
    super(message);
    this.name = 'DictionaryQueryError';
  }
}

export abstract class DictionaryV1<DS> extends CoreDictionary<
  DS,
  undefined,
  DictionaryV1Metadata,
  DictionaryV1QueryEntry[]
> {
  private useDistinct = true;
  private useStartHeight = true;

  constructor(
    readonly dictionaryEndpoint: string,
    chainId: string,
    nodeConfig: NodeConfig,
    protected readonly metadataKeys = ['lastProcessedHeight', 'genesisHash'], // Cosmos uses chain instead of genesisHash
    protected buildQueryFragment: typeof buildDictQueryFragment = buildDictQueryFragment
  ) {
    super(chainId, nodeConfig);
  }

  /**
   * Posts a GraphQL query to the dictionary and returns its `data`.
   *
   * Sent without a GraphQL client: each batch's query text differs, and a client parses and caches
   * a document for every one.
   */
  protected async query<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const response = await fetch(this.dictionaryEndpoint, {
      method: 'POST',
      headers: {'content-type': 'application/json', accept: 'application/json'},
      body: JSON.stringify({query, variables}),
    });

    let body: {data?: T; errors?: GraphQLError[]};
    try {
      body = (await response.json()) as typeof body;
    } catch {
      throw new DictionaryQueryError(
        `Dictionary returned HTTP ${response.status} without a JSON body`,
        response.status
      );
    }

    if (body.errors?.length) {
      throw new DictionaryQueryError(
        `Dictionary query failed: ${body.errors.map((e) => e.message).join('; ')}`,
        response.status,
        body.errors
      );
    }
    if (!response.ok || body.data === undefined) {
      throw new DictionaryQueryError(`Dictionary returned HTTP ${response.status} without data`, response.status);
    }

    return body.data;
  }

  protected async init(): Promise<void> {
    const {query} = this.metadataQuery();
    try {
      const data = await timeout(
        this.query<{_metadata: DictionaryV1Metadata}>(query),
        this.nodeConfig.dictionaryTimeout,
        `Dictionary metadata query timeout in ${
          this.nodeConfig.dictionaryTimeout
        } seconds. Please increase --dictionary-timeout. ${this.nodeConfig.debug ? `\n GraphQL: ${query}` : ''}`
      );
      this._metadata = data._metadata;
      this.setDictionaryStartHeight(this.metadata.startHeight);
    } catch (err: any) {
      if (JSON.stringify(err).includes(startHeightEscaped)) {
        this.useStartHeight = false;
        logger.warn(`Dictionary doesn't support validate start height.`);
        // Rerun the query now with distinct disabled
        await this.init();
      }
      logger.error(err, `Failed to get dictionary metadata`);
      throw err;
    }
  }

  getQueryEndBlock(targetBlockHeight: number, apiFinalizedHeight: number): number {
    return Math.min(targetBlockHeight, apiFinalizedHeight, this.metadata.lastProcessedHeight);
  }

  /**
   *
   * @param startBlock
   * @param queryEndBlock this block number will limit the max query range, increase dictionary query speed
   * @param batchSize
   * @param conditions
   */

  @profiler()
  async getData(
    startBlock: number,
    endBlock: number,
    batchSize: number
  ): Promise<DictionaryResponse<number> | undefined> {
    const {conditions, queryEndBlock} = this.getQueryConditions(startBlock, endBlock);
    if (!conditions || conditions.length === 0) {
      return undefined;
    }

    const {query, variables} = this.dictionaryQuery(startBlock, queryEndBlock, batchSize, conditions);

    logger.debug(`query: ${query}`);
    logger.debug(`variables: ${JSON.stringify(variables, null, 2)}`);
    try {
      const {_metadata, ...entities} = await timeout(
        this.query<DictionaryV1BatchResult>(query, variables),
        this.nodeConfig.dictionaryTimeout,
        `Dictionary query timeout in ${
          this.nodeConfig.dictionaryTimeout
        } seconds. Please increase --dictionary-timeout. ${
          this.nodeConfig.debug ? `\n GraphQL: ${query}, \n Variables: ${variables}` : ''
        }`
      );
      const blockHeightSet = new Set<number>();
      const entityEndBlock: {[entity: string]: number} = {};
      for (const [entity, {nodes}] of Object.entries(entities)) {
        for (const node of nodes) {
          blockHeightSet.add(Number(node.blockHeight));
          entityEndBlock[entity] = Number(node.blockHeight); //last added event blockHeight
        }
      }
      const endBlock = Math.min(...Object.values(entityEndBlock).map((height) => (isNaN(height) ? Infinity : height)));
      const batchBlocks = Array.from(blockHeightSet)
        .filter((block) => block <= endBlock)
        .sort((n1, n2) => n1 - n2);

      if (!this.dictionaryValidation(_metadata, startBlock)) {
        return undefined;
      }

      return {
        lastBufferedHeight: Math.min(endBlock, queryEndBlock),
        batchBlocks,
      };
    } catch (err: any) {
      // Check if the error is about distinct argument and disable distinct if so
      if (JSON.stringify(err).includes(distinctErrorEscaped)) {
        this.useDistinct = false;
        logger.warn(`Dictionary doesn't support distinct query.`);
        // Rerun the qeury now with distinct disabled
        return this.getData(startBlock, queryEndBlock, batchSize);
      }
      logger.warn(err, `failed to fetch dictionary result`);
      return undefined;
    }
  }

  queryMapValidByHeight(height: number): boolean {
    try {
      return !!this.queriesMap?.get(height)?.length;
    } catch (e: any) {
      logger.warn(e, `Unable to get query map by height ${height}`);
      return false;
    }
  }

  protected dictionaryValidation(metaData?: DictionaryV1Metadata, startBlockHeight?: number): boolean {
    const validate = (): boolean => {
      try {
        if (!metaData) {
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

    return valid;
  }

  private dictionaryQuery(
    startBlock: number,
    queryEndBlock: number,
    batchSize: number,
    conditions: DictionaryV1QueryEntry[]
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

  private metadataQuery(): GqlQuery {
    const nodes: GqlNode[] = [
      {
        entity: '_metadata',
        project: this.useStartHeight ? [...this.metadataKeys, 'startHeight'] : this.metadataKeys,
      },
    ];
    return buildQuery([], nodes);
  }

  protected validateChainMeta(metaData: DictionaryV1Metadata): boolean {
    return metaData.chain === this.chainId || metaData.genesisHash === this.chainId;
  }
}
