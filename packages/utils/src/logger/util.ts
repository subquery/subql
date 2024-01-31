// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {LevelWithSilent} from 'pino';
import {LEVELS_MAP} from './constants';

export function levelFilter(test: LevelWithSilent, target: LevelWithSilent): boolean {
  return LEVELS_MAP[<LevelWithSilent>test?.toLowerCase()] >= LEVELS_MAP[<LevelWithSilent>target.toLowerCase()];
}
