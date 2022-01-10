// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import path from 'path';
import {stringify} from 'flatted';
import Pino, {LevelWithSilent} from 'pino';
import {createStream} from 'rotating-file-stream';
import {colorizeLevel, ctx} from './colors';
export interface LoggerOption {
  level?: string;
  filepath?: string;
  rotate?: boolean;
  nestedKey?: string;
  outputFormat?: 'json' | 'colored';
}

export class Logger {
  private pino: Pino.Logger;
  private childLoggers: {[category: string]: Pino.Logger} = {};

  constructor({filepath, level: logLevel = 'info', nestedKey, outputFormat, rotate}: LoggerOption) {
    const options = {
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
      prettifier: function (options: unknown) {
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

        function isObject(input: unknown): boolean {
          return Object.prototype.toString.apply(input) === '[object Object]';
        }
      },
    } as Pino.LoggerOptions;

    if (filepath) {
      const baseName = path.basename(filepath);
      const dirName = path.dirname(path.resolve(filepath));

      const rotateOptions = {
        interval: '1d',
        maxFiles: 7,
        maxSize: '1G',
      };

      if (rotate) {
        this.pino = Pino(options, createStream(baseName, {path: dirName, ...rotateOptions}));
      } else {
        this.pino = Pino(options, createStream(baseName, {path: dirName}));
      }
    } else {
      this.pino = Pino(options);
    }
  }

  getLogger(category: string): Pino.Logger {
    if (!this.childLoggers[category]) {
      this.childLoggers[category] = this.pino.child({category});
    }
    return this.childLoggers[category];
  }

  setLevel(level: LevelWithSilent): void {
    this.pino.level = level;
  }
}
