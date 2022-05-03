// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventPayload, IndexerEvent } from '../indexer/events';

@Injectable()
export class MmrService {
  get mmr() {
    return;
  }
}
