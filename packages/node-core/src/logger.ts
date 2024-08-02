// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {isMainThread, threadId} from 'node:worker_threads';
import {LoggerService} from '@nestjs/common';
import {Logger} from '@subql/utils';
import Pino from 'pino';

let logger: Logger;

export function initLogger(
  debug: string | undefined = undefined,
  outputFmt?: 'json' | 'colored',
  logLevel?: string
): void {
  logger = new Logger({
    level: debug === '*' ? 'debug' : logLevel,
    outputFormat: outputFmt,
    nestedKey: 'payload',
    debugFilter: !debug || debug === '*' ? undefined : debug.split(','),
  });
}

// Init logger for tests
if ((global as any).__TEST__) {
  initLogger();
}

export function getLogger(category: string): Pino.Logger {
  return logger.getLogger(`${category}${isMainThread ? '' : `-#${threadId}`}`);
}

export function setLevel(level: Pino.LevelWithSilent): void {
  logger.setLevel(level);
}

export function setDebugFilter(debug: string | undefined): void {
  if (debug === '*') {
    logger.setLevel('debug');
  }
  logger.setDebugFilter(!debug || debug === '*' ? [] : debug.split(','));
}

export class NestLogger implements LoggerService {
  private logger = getLogger(`nestjs`);

  constructor(private readonly debugLevel = false) {}

  error(message: any, trace?: string): void {
    if (trace) {
      this.logger.error({trace}, message);
    } else {
      this.logger.error(message);
    }
  }

  log(message: any): void {
    // if (!this.debugLevel) return;
    this.logger.info(message);
  }

  warn(message: any): void {
    // if (!this.debugLevel) return;
    this.logger.warn(message);
  }

  debug(message: any): void {
    if (!this.debugLevel) return;
    this.logger.debug(message);
  }
}
