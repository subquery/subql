// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

/* class decorator */

import {performance} from 'perf_hooks';
import {getLogger} from './logger';

function isPromise(e: any): boolean {
  return !!e && typeof e.then === 'function';
}

const logger = getLogger('profiler');

function printCost(start: number, end: number, target: string, method: string | symbol): void {
  logger.info(`${target}, ${method.toString()}, ${end - start} ms`);
}

let enableProfiler = false;

export function setProfiler(enabled: boolean): void {
  enableProfiler = enabled;
}

export function profiler(): MethodDecorator {
  return (target, name: string | symbol, descriptor: PropertyDescriptor): void => {
    if (enableProfiler && !!descriptor && typeof descriptor.value === 'function') {
      const orig = descriptor.value;
      // tslint:disable no-function-expression no-invalid-this
      descriptor.value = function (...args: any[]): any {
        const start = performance.now();
        const res = orig.bind(this)(...args);
        if (isPromise(res)) {
          res.then(
            (_: any) => {
              printCost(start, performance.now(), target.constructor.name, name);
              return _;
            },
            (err: any) => {
              printCost(start, performance.now(), target.constructor.name, name);
              throw err;
            }
          );
        } else {
          printCost(start, performance.now(), target.constructor.name, name);
        }
        return res;
      };
    }
  };
}

type AnyFn = (...args: any[]) => any;

export const profilerWrap =
  <T extends AnyFn>(method: T, target: any, name: string) =>
  (...args: Parameters<T>): ReturnType<T> => {
    const start = performance.now();
    const res = method(...args);
    if (isPromise(res)) {
      res.then(
        (_: any) => {
          printCost(start, performance.now(), target, name);
          return _;
        },
        (err: any) => {
          printCost(start, performance.now(), target, name);
          throw err;
        }
      );
    } else {
      printCost(start, performance.now(), target, name);
    }
    return res;
  };
