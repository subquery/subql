// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {stringify} from 'flatted';
import Pino, {LevelWithSilent} from 'pino';
import {colorizeLevel, ctx} from './colors';

export interface LoggerOption {
  outputFormat?: 'json' | 'colored';
  level?: string;
  nestedKey?: string;
}

export class Logger {
  private pino: Pino.Logger;
  private childLoggers: {[category: string]: Pino.Logger} = {};

  constructor({level: logLevel = 'info', nestedKey, outputFormat}: LoggerOption) {
    this.pino = Pino({
      messageKey: 'message',
      timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
      nestedKey,
      level: logLevel,
      formatters: {
        level(label, number) {
          return {level: label};
        },
      },
      serializers:
        outputFormat === 'json'
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
                  return stringify(value);
                }
              },
            }
          : {},
      prettyPrint: outputFormat !== 'json',
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
          const {category, level, message, payload, time} = logObject;
          let error = '';
          if (payload instanceof Error) {
            if (['debug', 'trace'].includes(logLevel)) {
              error = `\n${payload.stack}`;
            } else {
              error = `${payload.name}: ${payload.message}`;
            }
          }
          return `${time} <${ctx.magentaBright(category)}> ${colorizeLevel(level)} ${message} ${error}\n`;
        };

        function isObject(input) {
          return Object.prototype.toString.apply(input) === '[object Object]';
        }
      },
    });
  }

  getLogger(category: string): Pino.Logger {
    if (!this.childLoggers[category]) {
      this.childLoggers[category] = this.pino.child({category, level: this.pino.level});
    }
    return this.childLoggers[category];
  }

  setLevel(level: LevelWithSilent): void {
    this.pino.level = level;
    for (const childLogger of Object.values(this.childLoggers)) {
      childLogger.level = level;
    }
  }
}
