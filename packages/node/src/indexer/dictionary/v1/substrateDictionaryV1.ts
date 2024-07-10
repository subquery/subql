// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import assert from 'assert';
import { gql } from '@apollo/client/core';
import {
  isCustomDs,
  isRuntimeDs,
  SubstrateCallFilter,
  SubstrateCustomHandler,
  SubstrateDataSource,
  SubstrateEventFilter,
  SubstrateHandler,
  SubstrateHandlerKind,
  SubstrateRuntimeHandlerFilter,
} from '@subql/common-substrate';
import { NodeConfig, DictionaryV1, timeout, getLogger } from '@subql/node-core';
import { SubstrateBlockFilter, SubstrateDatasource } from '@subql/types';
import {
  DictionaryQueryCondition,
  DictionaryQueryEntry as DictionaryV1QueryEntry,
} from '@subql/types-core';
import { buildQuery, GqlNode, GqlQuery } from '@subql/utils';
import { sortBy, uniqBy } from 'lodash';
import { SubqueryProject } from '../../../configure/SubqueryProject';
import { isBaseHandler, isCustomHandler } from '../../../utils/project';
import { DsProcessorService } from '../../ds-processor.service';
import { SpecVersion, SpecVersionDictionary } from '../types';

type GetDsProcessor = DsProcessorService['getDsProcessor'];

function eventFilterToQueryEntry(
  filter: SubstrateEventFilter,
): DictionaryV1QueryEntry {
  const conditions: DictionaryQueryCondition[] = [];
  if (filter.method) {
    conditions.push({ field: 'event', value: filter.method });
  }
  if (filter.module) {
    conditions.push({ field: 'module', value: filter.module });
  }
  return {
    entity: 'events',
    conditions,
  };
}

function callFilterToQueryEntry(
  filter: SubstrateCallFilter,
): DictionaryV1QueryEntry {
  return {
    entity: 'extrinsics',
    conditions: Object.keys(filter)
      .map(
        (key) =>
          ({
            field: key === 'method' ? 'call' : key,
            value: filter[key as keyof SubstrateCallFilter],
          }) as DictionaryQueryCondition,
      )
      .filter((c) => c.value !== undefined),
  };
}

function getBaseHandlerKind(
  ds: SubstrateDataSource,
  handler: SubstrateHandler,
  getDsProcessor: GetDsProcessor,
): SubstrateHandlerKind | undefined {
  if (isRuntimeDs(ds) && isBaseHandler(handler)) {
    return handler.kind;
  } else if (isCustomDs(ds) && isCustomHandler(handler)) {
    const plugin = getDsProcessor(ds);
    const baseHandler = plugin.handlerProcessors[handler.kind]?.baseHandlerKind;
    if (!baseHandler) {
      throw new Error(
        `handler type ${handler.kind} not found in processor for ${ds.kind}`,
      );
    }
    return baseHandler;
  }
}

function getBaseHandlerFilters<T extends SubstrateRuntimeHandlerFilter>(
  ds: SubstrateDataSource,
  handlerKind: string,
  getDsProcessor: GetDsProcessor,
): T[] {
  if (isCustomDs(ds)) {
    const plugin = getDsProcessor(ds);
    const processor = plugin.handlerProcessors[handlerKind];
    return processor.baseFilter instanceof Array
      ? (processor.baseFilter as T[])
      : ([processor.baseFilter] as T[]);
  } else {
    throw new Error(`Expected a custom datasource here`);
  }
}

// eslint-disable-next-line complexity
export function buildDictionaryV1QueryEntries(
  dataSources: SubstrateDatasource[],
  getDsProcessor: GetDsProcessor,
): DictionaryV1QueryEntry[] {
  const queryEntries: DictionaryV1QueryEntry[] = [];

  for (const ds of dataSources) {
    const plugin = isCustomDs(ds) ? getDsProcessor(ds) : undefined;
    for (const handler of ds.mapping.handlers) {
      const baseHandlerKind = getBaseHandlerKind(ds, handler, getDsProcessor);
      let filterList: SubstrateRuntimeHandlerFilter[] = [];
      if (isCustomDs(ds)) {
        assert(plugin, 'plugin should be defined');
        const processor = plugin.handlerProcessors[handler.kind];
        const filter = (handler as SubstrateCustomHandler).filter;
        if (processor.dictionaryQuery && filter) {
          const queryEntry = processor.dictionaryQuery(filter, ds);
          if (queryEntry) {
            queryEntries.push(queryEntry);
            continue;
          }
        }
        filterList = getBaseHandlerFilters<SubstrateRuntimeHandlerFilter>(
          ds,
          handler.kind,
          getDsProcessor,
        );
      } else if (handler.filter) {
        filterList = [handler.filter];
      }
      // Filter out any undefined
      filterList = filterList.filter(Boolean);
      if (!filterList.length) return [];
      switch (baseHandlerKind) {
        case SubstrateHandlerKind.Block:
          for (const filter of filterList as SubstrateBlockFilter[]) {
            if (filter.modulo === undefined) {
              return [];
            }
          }
          break;
        case SubstrateHandlerKind.Call: {
          for (const filter of filterList as SubstrateCallFilter[]) {
            if (
              filter.module !== undefined ||
              filter.method !== undefined ||
              filter.isSigned !== undefined ||
              filter.success !== undefined
            ) {
              queryEntries.push(callFilterToQueryEntry(filter));
            } else {
              return [];
            }
          }
          break;
        }
        case SubstrateHandlerKind.Event: {
          for (const filter of filterList as SubstrateEventFilter[]) {
            if (filter.module !== undefined || filter.method !== undefined) {
              queryEntries.push(eventFilterToQueryEntry(filter));
            } else {
              return [];
            }
          }
          break;
        }
        default: {
          throw new Error(`Unsupported handler kind: ${baseHandlerKind}`);
        }
      }
    }
  }

  return uniqBy(
    queryEntries,
    (item) =>
      `${item.entity}|${JSON.stringify(
        sortBy(item.conditions, (c) => c.field),
      )}`,
  );
}

const logger = getLogger('substrate-dictionary-V1');

export class SubstrateDictionaryV1 extends DictionaryV1<SubstrateDataSource> {
  constructor(
    project: SubqueryProject,
    nodeConfig: NodeConfig,
    protected getDsProcessor: GetDsProcessor,
    dictionaryUrl: string,
    chainId?: string,
  ) {
    super(dictionaryUrl, chainId ?? project.network.chainId, nodeConfig);
  }

  static async create(
    project: SubqueryProject,
    nodeConfig: NodeConfig,
    getDsProcessor: GetDsProcessor,
    dictionaryUrl: string,
    chainId?: string,
  ): Promise<SubstrateDictionaryV1> {
    const dictionary = new SubstrateDictionaryV1(
      project,
      nodeConfig,
      getDsProcessor,
      dictionaryUrl,
      chainId,
    );
    await dictionary.init();
    return dictionary;
  }

  buildDictionaryQueryEntries(
    dataSources: SubstrateDataSource[],
  ): DictionaryV1QueryEntry[] {
    return buildDictionaryV1QueryEntries(dataSources, this.getDsProcessor);
  }

  parseSpecVersions(raw?: SpecVersionDictionary): SpecVersion[] {
    if (raw === undefined) {
      return [];
    }
    const specVersionBlockHeightSet = new Set<SpecVersion>();
    const specVersions = (raw.specVersions as any).nodes;
    const _metadata = raw._metadata;

    // Add range for -1 specVersions
    for (let i = 0; i < specVersions.length - 1; i++) {
      specVersionBlockHeightSet.add({
        id: specVersions[i].id,
        start: Number(specVersions[i].blockHeight),
        end: Number(specVersions[i + 1].blockHeight) - 1,
      });
    }
    if (specVersions && specVersions.length >= 0) {
      // Add range for the last specVersion
      if (_metadata.lastProcessedHeight) {
        specVersionBlockHeightSet.add({
          id: specVersions[specVersions.length - 1].id,
          start: Number(specVersions[specVersions.length - 1].blockHeight),
          end: Number(_metadata.lastProcessedHeight),
        });
      }
    }
    return Array.from(specVersionBlockHeightSet);
  }

  async getSpecVersionsRaw(): Promise<SpecVersionDictionary | undefined> {
    const { query } = this.specVersionQuery();
    try {
      const resp = await timeout(
        this.client.query({
          query: gql(query),
        }),
        this.nodeConfig.dictionaryTimeout,
      );

      const _metadata = resp.data._metadata;
      const specVersions = resp.data.specVersions;
      return { _metadata, specVersions };
    } catch (err: any) {
      logger.warn(err, `failed to fetch specVersion result`);
      return undefined;
    }
  }

  async getSpecVersions(): Promise<SpecVersion[] | undefined> {
    try {
      return this.parseSpecVersions(await this.getSpecVersionsRaw());
    } catch {
      return undefined;
    }
  }

  private specVersionQuery(): GqlQuery {
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
          orderBy: 'BLOCK_HEIGHT_ASC',
        },
      },
    ];
    return buildQuery([], nodes);
  }
}
