// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {getLogger} from './logger';

/* class decorator */

function isPromise(e: any): boolean {
  return !!e && typeof e.then === 'function';
}
const logger = getLogger('profiler');

function printCost(start: Date, end: Date, target: string, method: string): void {
  logger.info(`${target}, ${method}, ${end.getTime() - start.getTime()} ms`);
}
export function profiler(enabled = true): any {
  return (target: any, name: string, descriptor: PropertyDescriptor): void => {
    if (enabled && !!descriptor && typeof descriptor.value === 'function') {
      const orig = descriptor.value;
      // tslint:disable no-function-expression no-invalid-this
      descriptor.value = function (...args: any[]): any {
        const start = new Date();
        const res = orig.bind(this)(...args);
        if (isPromise(res)) {
          res.then(
            (_: any) => {
              printCost(start, new Date(), target.constructor.name, name);
              return _;
            },
            (err: any) => {
              printCost(start, new Date(), target.constructor.name, name);
              throw err;
            }
          );
        } else {
          printCost(start, new Date(), target.constructor.name, name);
        }
        return res;
      };
    }
  };
}

export const profilerWrap =
  (method: any, target: any, name: string): any =>
  (...args: any[]) => {
    const start = new Date();
    const res = method(...args);
    if (isPromise(res)) {
      res.then(
        (_: any) => {
          printCost(start, new Date(), target, name);
          return _;
        },
        (err: any) => {
          printCost(start, new Date(), target, name);
          throw err;
        }
      );
    } else {
      printCost(start, new Date(), target, name);
    }
    return res;
  };
