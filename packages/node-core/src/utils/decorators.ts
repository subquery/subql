// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {isMainThread} from 'worker_threads';
import {getLogger} from '../logger';

const logger = getLogger('main');
export function mainThreadOnly(): MethodDecorator {
  return (target, name: string | symbol, descriptor: PropertyDescriptor): void => {
    if (!!descriptor && typeof descriptor.value === 'function') {
      const orig = descriptor.value;
      // tslint:disable no-function-expression no-invalid-this
      descriptor.value = function (...args: any[]): any {
        if (!isMainThread) {
          logger.warn(`${name?.toString()} should only run in main thread`);
        }
        return orig.bind(this)(...args);
      };
    }
  };
}
