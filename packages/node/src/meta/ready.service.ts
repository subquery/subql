// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventPayload, IndexerEvent } from '../indexer/events';

@Injectable()
export class ReadyService {
  private _ready: boolean;

  constructor() {
    this._ready = false;
  }

  @OnEvent(IndexerEvent.Ready)
  handleReady({ value }: EventPayload<boolean>): void {
    this._ready = value;
  }

  get ready() {
    return this._ready;
  }
}
