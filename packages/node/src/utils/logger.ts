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

const ctx = new chalk.Instance({ level: 3 })
const colored = {
  default: ctx.white,
  60: ctx.bgRed,
  50: ctx.red,
  40: ctx.yellow,
  30: ctx.green,
  20: ctx.blue,
  10: ctx.grey,
  message: ctx.cyan
}

function colorizeLevel (level: number) {
  if (Number.isInteger(+level)) {
    return Object.prototype.hasOwnProperty.call(LEVELS, level)
      ? colored[level](LEVELS[level])
      : colored.default(LEVELS.default)
  }
  return colored.default(LEVELS.default)
}

const outputFmt = argv('output-fmt');

const logger = Pino({
  messageKey: 'message',
  timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
  nestedKey: 'paylad',
  formatters: {
    level (label, number) {
      return { level: label };
    },
  },
  prettyPrint: outputFmt !== 'json',
  prettifier: function(options) {
    // `this` is bound to the pino instance
    // Deal with whatever options are supplied.
    return function prettifier(inputData: string | object) {
      let logObject
      if (typeof inputData === 'string') {
        logObject = JSON.parse(inputData)
      } else if (isObject(inputData)) {
        logObject = inputData
      }
      if (!logObject) return inputData
      // implement prettification
      const {category, level, message, time} = logObject;
      return `${time} <${ctx.magentaBright(category)}> ${colorizeLevel(level)} ${message} \n`;
    }

    function isObject(input) {
      return Object.prototype.toString.apply(input) === '[object Object]'
    }
  }
});

const childLoggers: {[category: string]: Logger} = {};

export function getLogger(category: string): Logger {
  if (!childLoggers[category]) {
    childLoggers[category] = logger.child({category});
  }
  return childLoggers[category];
}

export function setLevel(level: LevelWithSilent): void {
  logger.level = level;
  for (const childLogger of Object.values(childLoggers) ) {
    childLogger.level = level;
  }
}

export class NestLogger implements LoggerService {
  private logger = logger.child({category: 'nestjs'});

  error(message: any, trace?: string, context?: string) {
    this.logger.error(message, trace);
  }

  log(message: any, context?: string): any {
    this.logger.info(message);
  }

  warn(message: any, context?: string): any {
    this.logger.warn(message);
  }

}
