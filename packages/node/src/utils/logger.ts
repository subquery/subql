// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { LoggerService } from '@nestjs/common';
import chalk from 'chalk';
import Pino, { LevelWithSilent, Logger } from 'pino';
import { argv } from '../yargs';

const LEVELS = {
  default: 'USERLVL',
  60: 'FATAL',
  50: 'ERROR',
  40: 'WARN',
  30: 'INFO',
  20: 'DEBUG',
  10: 'TRACE',
};

const ctx = new chalk.Instance({ level: 3 });
const colored = {
  default: ctx.white,
  60: ctx.bgRed,
  50: ctx.red,
  40: ctx.yellow,
  30: ctx.green,
  20: ctx.blue,
  10: ctx.grey,
  message: ctx.cyan,
};

function colorizeLevel(level: number) {
  if (Number.isInteger(+level)) {
    return Object.prototype.hasOwnProperty.call(LEVELS, level)
      ? colored[level](LEVELS[level])
      : colored.default(LEVELS.default);
  }
  return colored.default(LEVELS.default);
}

const outputFmt = argv('output-fmt');
const debug = argv('debug');

const logger = Pino({
  messageKey: 'message',
  timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
  nestedKey: 'payload',
  formatters: {
    level(label, number) {
      return { level: label };
    },
  },
  serializers:
    outputFmt === 'json'
      ? {
          payload: (value) => {
            if (value instanceof Error) {
              return {
                type: 'error',
                name: value.name,
                message: value.message,
                stack: value.stack,
              };
            } else {
              return JSON.stringify(value);
            }
          },
        }
      : {},
  prettyPrint: outputFmt !== 'json',
  prettifier: function (options) {
    // `this` is bound to the pino instance
    // Deal with whatever options are supplied.
    return function prettifier(inputData: string | object) {
      let logObject;
      if (typeof inputData === 'string') {
        logObject = JSON.parse(inputData);
      } else if (isObject(inputData)) {
        logObject = inputData;
      }
      if (!logObject) return inputData;
      // implement prettification
      const { category, level, message, payload, time } = logObject;
      let error = '';
      if (payload instanceof Error) {
        if (debug) {
          error = `\n${payload.stack}`;
        } else {
          error = `${payload.name}: ${payload.message}`;
        }
      }
      return `${time} <${ctx.magentaBright(category)}> ${colorizeLevel(
        level,
      )} ${message} ${error}\n`;
    };

    function isObject(input) {
      return Object.prototype.toString.apply(input) === '[object Object]';
    }
  },
});

const childLoggers: { [category: string]: Logger } = {};

export function getLogger(category: string): Logger {
  if (!childLoggers[category]) {
    childLoggers[category] = logger.child({ category });
  }
  return childLoggers[category];
}

export function setLevel(level: LevelWithSilent): void {
  logger.level = level;
  for (const childLogger of Object.values(childLoggers)) {
    childLogger.level = level;
  }
}

export class NestLogger implements LoggerService {
  private logger = logger.child({ category: 'nestjs' });

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
