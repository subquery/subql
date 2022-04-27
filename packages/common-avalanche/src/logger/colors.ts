// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import chalk from 'chalk';
import {LEVELS} from './constants';

export const ctx = new chalk.Instance({level: 3});
const colored: Record<keyof typeof LEVELS | 'message', chalk.Chalk> = {
  default: ctx.white,
  60: ctx.bgRed,
  50: ctx.red,
  40: ctx.yellow,
  30: ctx.green,
  20: ctx.blue,
  10: ctx.grey,
  message: ctx.cyan,
};

function isColouredValue(level: number | string): level is keyof typeof LEVELS {
  return Number.isInteger(+level) && level in colored;
}

export function colorizeLevel(level: number): string {
  if (isColouredValue(level) && Object.prototype.hasOwnProperty.call(LEVELS, level)) {
    return colored[level](LEVELS[level]);
  }
  return colored.default(LEVELS.default);
}
