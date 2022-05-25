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

  error(message: any, trace?: string) {
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

const scopes: Record<string, PerfScope> = {};
export class PerfScope {
  private readonly startTime: Date;
  private endTime?: Date;
  private children: Record<string, PerfScope> = {};

  constructor(public name: string, private root = false) {
    this.startTime = new Date();
  }

  start(name: string): PerfScope {
    if (!this.children[name]) {
      this.children[name] = new PerfScope(name);
    }
    return this.children[name];
  }

  stop(name: string): void {
    const scope = this.children[name];

    if (!scope) return;

    scope.end();
  }

  async measure<T>(name: string, promise: Promise<T>): Promise<T> {
    this.start(name);

    try {
      const res = await promise;

      return res;
    } finally {
      this.stop(name);
    }
  }

  end(prefix?: string): void {
    // Only set end time once
    if (!this.endTime) {
      this.endTime = new Date();
    }

    // Stop any children
    Object.values(this.children).map((c) => c.end());

    if (this.root) {
      this.print(0, prefix);
      delete scopes[this.name];
    }
  }

  print(depth = 0, prefix?: string): void {
    const duration =
      (this.endTime ?? new Date()).getTime() - this.startTime.getTime();

    const logDepth = argv('perf');
    if (depth >= logDepth && logDepth !== -1) return;

    // TODO format time
    console.log(
      depth === 0 ? '\x1b[33m%s\x1b[0m' : '',
      `${'  '.repeat(depth)}${prefix ?? ''}${this.name}: ${duration} ms`,
    );

    Object.values(this.children).map((c) => c.print(depth + 1));
  }
}

export function perfLogger(name: string | number): PerfScope {
  name = name.toString();

  if (!scopes[name]) {
    scopes[name] = new PerfScope(name, true);
  }

  return scopes[name];
}
