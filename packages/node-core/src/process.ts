// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
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

export function monitorWrite(blockData: string): void {
  if (monitorService) {
    monitorService.write(blockData);
  }
}

export function monitorCreateBlockStart(blockNumber: number): void {
  if (monitorService) {
    monitorService.createBlockStart(blockNumber);
  }
}

export function monitorCreateBlockFork(blockNumber: number): void {
  if (monitorService) {
    monitorService.createBlockFork(blockNumber);
  }
}
