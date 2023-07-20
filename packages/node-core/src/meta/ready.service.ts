// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Injectable} from '@nestjs/common';
import {OnEvent} from '@nestjs/event-emitter';
import {EventPayload, IndexerEvent} from '../events';

@Injectable()
export class ReadyService {
  private _ready: boolean;

  constructor() {
    this._ready = false;
  }

  @OnEvent(IndexerEvent.Ready)
  handleReady({value}: EventPayload<boolean>): void {
    this._ready = value;
  }

  get ready(): boolean {
    return this._ready;
  }
}
