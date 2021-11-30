// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {LoggerService} from '@nestjs/common';
import {Logger} from '@subql/common';
import Pino from 'pino';
import {argv} from '../yargs';

const outputFmt = argv('output-fmt') as 'json' | 'colored';
const logLevel = argv('log-level') as string | undefined;
const logPath = argv('log-path') as string | undefined;
const logRotate = argv('log-rotate') as boolean | undefined;

const logger = new Logger({level: logLevel, filepath: logPath, rotate: logRotate, outputFormat: outputFmt});

export function getLogger(category: string): Pino.Logger {
  return logger.getLogger(category);
}

export class NestLogger implements LoggerService {
  private logger = logger.getLogger('nestjs');

  error(message: any, trace?: string) {
    if (trace) {
      this.logger.error({trace}, message);
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
