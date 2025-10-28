// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Interface } from '@ethersproject/abi';
import {
  SubqlRuntimeHandler,
  SubqlCustomHandler,
  SubqlHandler,
  EthereumHandlerKind,
  SubqlEthereumHandlerKind,
  isCustomDs,
  isRuntimeDs,
  SubqlEthereumDataSource,
  EthereumLogFilter,
  EthereumTransactionFilter,
  getAbiInterface,
} from '@subql/common-ethereum';
import { getLogger, retryOnFail } from '@subql/node-core';
import {
  EthereumProjectDs,
  SubqueryProject,
} from '../configure/SubqueryProject';
import {
  extractCustomTypesFromAbi,
  resolveCustomTypesInSignature,
} from './string';

const logger = getLogger('project');

export function isBaseHandler(
  handler: SubqlHandler,
): handler is SubqlRuntimeHandler {
  return Object.values<string>(EthereumHandlerKind).includes(handler.kind);
}

export function isCustomHandler(
  handler: SubqlHandler,
): handler is SubqlCustomHandler {
  return !isBaseHandler(handler);
}

const handledErrors = ['timeout'];
// eslint-disable-next-line @typescript-eslint/require-await
export async function retryOnFailEth<T>(
  request: () => Promise<T>,
  errors = handledErrors,
): Promise<T> {
  return retryOnFail(request, (e) => !!errors.find((t) => t === e?.reason));
}

export function onlyHasLogDataSources(
  dataSources: EthereumProjectDs[],
): boolean {
  for (const ds of dataSources) {
    for (const handler of ds.mapping.handlers) {
      if (handler.kind !== SubqlEthereumHandlerKind.EthEvent) {
        return false;
      }
    }
  }

  return true;
}

function dsContainsNonEventHandlers(ds: EthereumProjectDs): boolean {
  if (isRuntimeDs(ds)) {
    return !!ds.mapping.handlers.find(
      (handler) => handler.kind !== EthereumHandlerKind.Event,
    );
  } else if (isCustomDs(ds)) {
    // TODO this can be improved upon in the future.
    return true;
  }
  return true;
}

export function isOnlyEventHandlers(project: SubqueryProject): boolean {
  const hasNonEventHandler = !!project.dataSources.find((ds) =>
    dsContainsNonEventHandlers(ds),
  );
  const hasNonEventTemplate = !!project.templates.find((ds) =>
    dsContainsNonEventHandlers(ds as EthereumProjectDs),
  );

  return !hasNonEventHandler && !hasNonEventTemplate;
}

/**
 * Helper function to load ABI interface from a datasource
 */
function getAbiInterfaceFromDs(
  ds: SubqlEthereumDataSource,
  projectPath: string,
): Interface | undefined {
  try {
    if (!ds?.options?.abi || !projectPath) {
      return undefined;
    }

    return getAbiInterface(projectPath, ds.options.abi);
  } catch (error) {
    logger.warn(
      `Failed to load ABI interface for datasource: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
    );
    return undefined;
  }
}

/**
 * Process event handler topic filters and resolve custom types
 */
function processEventHandlerFilters(
  handler: SubqlHandler,
  customTypes: Map<string, any>,
): void {
  if (handler.kind !== EthereumHandlerKind.Event) {
    return;
  }

  const logFilter = handler.filter as EthereumLogFilter | undefined;
  if (!logFilter?.topics) {
    return;
  }

  // Only resolve custom types in the first topic (topic0), which is the event signature
  const topic = logFilter.topics[0];
  if (
    typeof topic === 'string' &&
    topic.trim() !== '' &&
    !topic.startsWith('0x')
  ) {
    const resolved = resolveCustomTypesInSignature(topic, customTypes);
    if (resolved !== topic) {
      logFilter.topics[0] = resolved;
      logger.info(`Resolved topic filter: "${topic}" -> "${resolved}"`);
    }
  }
}

/**
 * Process transaction handler function filters and resolve custom types
 */
function processTransactionHandlerFilters(
  handler: SubqlHandler,
  customTypes: Map<string, any>,
): void {
  if (handler.kind !== EthereumHandlerKind.Call) {
    return;
  }

  const txFilter = handler.filter as EthereumTransactionFilter | undefined;
  if (!txFilter?.function) {
    return;
  }

  const funcSig = txFilter.function;
  if (typeof funcSig === 'string' && !funcSig.startsWith('0x')) {
    const resolved = resolveCustomTypesInSignature(funcSig, customTypes);
    if (resolved !== funcSig) {
      txFilter.function = resolved;
      logger.info(`Resolved function filter: "${funcSig}" -> "${resolved}"`);
    }
  }
}

/**
 * Resolves custom types (enums, structs) in topic filters for all datasources at project load time.
 * Mutates the datasource handlers' topic filters in-place.
 *
 * This ensures that:
 * - Enums are replaced with uint8
 * - Structs are replaced with tuple notation (type1,type2,...)
 * - No runtime ABI resolution is needed
 *
 * @param dataSources - Array of datasources to process (mutated in-place)
 * @param projectPath - The project root path for loading ABI files
 */
export function resolveTopicFiltersInProject(
  dataSources: SubqlEthereumDataSource[],
  projectPath: string,
): void {
  for (const ds of dataSources) {
    try {
      // Load ABI interface
      const abiInterface = getAbiInterfaceFromDs(ds, projectPath);
      if (!abiInterface) {
        continue;
      }

      // Extract custom types once per datasource
      const customTypes = extractCustomTypesFromAbi(abiInterface);
      if (customTypes.size === 0) {
        continue; // No custom types, no need to process
      }

      // Log discovered custom types
      const customTypeNames = Array.from(customTypes.keys()).join(', ');
      logger.info(
        `Found custom types in ABI '${ds.options?.abi}': ${customTypeNames}`,
      );

      // Process each handler
      for (const handler of ds.mapping.handlers) {
        processEventHandlerFilters(handler, customTypes);
        processTransactionHandlerFilters(handler, customTypes);
      }
    } catch (error) {
      logger.warn(
        `Failed to resolve custom types for datasource: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }
}
