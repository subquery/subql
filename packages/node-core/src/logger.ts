// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {isMainThread, threadId} from 'node:worker_threads';
import {LoggerService} from '@nestjs/common';
import {Logger} from '@subql/utils';
import Pino from 'pino';
import {argv} from './yargs';

const outputFmt = argv('output-fmt') as 'json' | 'colored';
const debug = argv('debug');
const logLevel = argv('log-level') as string | undefined;

console.log('HERE');
const logger = new Logger({
  level: debug ? 'debug' : logLevel,
  outputFormat: outputFmt,
  nestedKey: 'payload',
});

console.log('HERE');

export function getLogger(category: string): Pino.Logger {
  return logger.getLogger(category);
}

console.log('HERE');

export function setLevel(level: Pino.LevelWithSilent): void {
  logger.setLevel(level);
}

console.log('HERE');

export class NestLogger implements LoggerService {
  private logger = logger.getLogger(`nestjs${isMainThread ? '-0' : `-#${threadId}`}`);

  error(message: any, trace?: string): void {
    if (trace) {
      this.logger.error({trace}, message);
    } else {
      this.logger.error(message);
    }
  }

  log(message: any): void {
    this.logger.info(message);
  }

  warn(message: any): void {
    this.logger.warn(message);
  }
}

console.log('HERE');
