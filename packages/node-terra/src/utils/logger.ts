// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { LoggerService } from '@nestjs/common';
import { Logger } from '@subql/utils';
import Pino from 'pino';
import { argv } from '../yargs';

const outputFmt = argv('output-fmt') as 'json' | 'colored';
const debug = argv('debug');
const logLevel = argv('log-level') as string | undefined;

const logger = new Logger({
  level: debug ? 'debug' : logLevel,
  outputFormat: outputFmt,
  nestedKey: 'payload',
});

export function getLogger(category: string): Pino.Logger {
  return logger.getLogger(category);
}

export function setLevel(level: Pino.LevelWithSilent): void {
  logger.setLevel(level);
}

export class NestLogger implements LoggerService {
  private logger = logger.getLogger('nestjs');

  error(message: any, trace?: string): void {
    if (trace) {
      this.logger.error({ trace }, message);
    } else {
      this.logger.error(message);
    }
  }

  log(message: any): any {
    this.logger.info(message);
  }

  warn(message: any): any {
    this.logger.warn(message);
  }
}
