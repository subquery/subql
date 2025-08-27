// Copyright 2020-2025 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import Pino from 'pino';
import {MonitorServiceInterface} from './indexer';

let monitorService: MonitorServiceInterface;

export function setMonitorService(service: MonitorServiceInterface): void {
  monitorService = service;
}

export function exitWithError(error: Error | string, logger?: Pino.Logger, code = 1): never {
  const errorMessage = typeof error === 'string' ? error : error.message;
  logger?.error(error as any); /* Bad types */
  monitorService?.write(`[EXIT ${code}]: ${errorMessage}`);
  process.exit(code);
}

// Function argument is to allow for lazy evaluation only if monitor service is enabled
export function monitorWrite(blockData: string | (() => string)): void {
  monitorService?.write(blockData);
}

export function monitorCreateBlockStart(blockNumber: number): void {
  monitorService?.createBlockStart(blockNumber);
}

export function monitorCreateBlockFork(blockNumber: number): void {
  monitorService?.createBlockFork(blockNumber);
}
