// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

/* class decorator */

import { getLogger } from './logger';

function isPromise(e: any): boolean {
  return !!e && typeof e.then === 'function';
}
const logger = getLogger('profiler');

function printCost(start: Date, end: Date, target: any, method: string): void {
  logger.trace(
    `${target.constructor.name}, ${method}, ${end.getTime() - start.getTime()}`,
  );
}
export function profiler(enabled: boolean = true): any {
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
              printCost(start, new Date(), target, name);
              return _;
            },
            (err: any) => {
              printCost(start, new Date(), target, name);
              throw err;
            },
          );
        } else {
          printCost(start, new Date(), target, name);
        }
        return res;
      };
    }
  };
}
