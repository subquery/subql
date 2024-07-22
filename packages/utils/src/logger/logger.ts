// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import path from 'path';
import {isMainThread, threadId} from 'worker_threads';
import {stringify} from 'flatted';
import Pino, {LevelWithSilent} from 'pino';
import {createStream} from 'rotating-file-stream';
import {colorizeLevel, ctx} from './colors';
import {LEVELS, LEVELS_MAP} from './constants';
export interface LoggerOption {
  level?: string;
  filepath?: string;
  rotate?: boolean;
  nestedKey?: string;
  outputFormat?: 'json' | 'colored';
  /**
   * Set the debug level for specific child loggers
   * */
  debugFilter?: string[];
}

function formatErrorString(err: unknown, stack = false): string {
  if (err instanceof Error) {
    const t = err.constructor.name ?? 'Error';
    let formattedError = `${ctx.red(`${t}:`)} ${ctx.yellow(err.message)}`;

    if (stack) {
      formattedError += `\n${ctx.red('Stack:')} ${ctx.gray(err.stack)}`;
    }

    if (err.cause) {
      formattedError += `\n${ctx.red('Cause:')} ${formatErrorString(err.cause, stack)}`;
    }

    return formattedError;
  }
  return String(err);
}

function formatErrorJson(err: unknown): unknown {
  if (err instanceof Error) {
    return {
      type: 'error',
      name: err.name,
      message: err.message,
      stack: err.stack,
      cause: err.cause ? formatErrorJson(err.cause) : undefined,
    };
  } else {
    return stringify(err);
  }
}

export class Logger {
  private pino: Pino.Logger;
  private childLoggers: {[category: string]: Pino.Logger} = {};
  private _debugFilter: string[];

  constructor({filepath, level: logLevel = 'info', nestedKey, outputFormat, rotate, debugFilter = []}: LoggerOption) {
    this._debugFilter = debugFilter;

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
              payload: formatErrorJson,
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
              error = `\n${formatErrorString(payload, true)}`;
            } else {
              error = formatErrorString(payload);
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

      this.applyChildDebug(category);
    }
    return this.childLoggers[category];
  }

  setLevel(level: LevelWithSilent): void {
    this.pino.level = level;

    Object.keys(this.childLoggers).map((key) => this.applyChildDebug(key));
  }

  setDebugFilter(debugFilter: string[]): void {
    this._debugFilter = debugFilter;
    Object.keys(this.childLoggers).map((key) => this.applyChildDebug(key));
  }

  private get debugFilter(): string[] {
    return this._debugFilter.map((f) => f.trim());
  }

  private applyChildDebug(category: string) {
    if (!this.childLoggers[category].level) return;

    const checkCategory = isMainThread ? category : category.replace(`-#${threadId}`, '');

    if (this.debugFilter.includes(`-${checkCategory}`)) {
      this.pino.info(`Debug logging is disabled for ${category}`);
      // Set the log level to the global log level or INFO if its debug
      const newLevel = Math.max(LEVELS_MAP[<LevelWithSilent>this.pino.level], LEVELS_MAP.info);
      this.childLoggers[category].level = LEVELS[newLevel as keyof typeof LEVELS].toLowerCase();
    } else if (this.debugFilter.includes(checkCategory)) {
      this.pino.info(`Debug logging is enabled for ${category}`);
      this.childLoggers[category].level = 'debug';
    } else if (this.debugFilter.includes('*')) {
      // Don't log wildcards, it spams the output
      this.childLoggers[category].level = 'debug';
    }
  }
}
