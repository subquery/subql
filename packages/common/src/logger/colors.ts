// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import chalk from 'chalk';
import {LEVELS} from './constants';

export const ctx = new chalk.Instance({level: 3});
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

export function colorizeLevel(level: number) {
  if (Number.isInteger(+level)) {
    return Object.prototype.hasOwnProperty.call(LEVELS, level)
      ? colored[level](LEVELS[level])
      : colored.default(LEVELS.default);
  }
  return colored.default(LEVELS.default);
}
