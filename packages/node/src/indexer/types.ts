// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { SubqlCallFilter, SubqlEventFilter } from '@subql/common';
import {
  SubstrateBlock,
  SubstrateEvent,
  SubstrateExtrinsic,
} from '@subql/types';

export interface BlockContent {
  block: SubstrateBlock;
  extrinsics: SubstrateExtrinsic[];
  events: SubstrateEvent[];
}

export interface ProjectIndexFilters {
  existBlockHandler: boolean;
  existEventHandler: boolean;
  existExtrinsicHandler: boolean;
  eventFilters: SubqlEventFilter[];
  extrinsicFilters: SubqlCallFilter[];
}
