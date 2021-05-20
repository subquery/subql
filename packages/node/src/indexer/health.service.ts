// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { OnEvent } from '@nestjs/event-emitter';
import { Interval } from '@nestjs/schedule';
import { getLogger } from '../utils/logger';
import { delay } from '../utils/promise';
import {
  IndexerEvent,
  NetworkMetadataPayload,
  TargetBlockPayload,
} from './events';

let SAMPLING_TIME_VARIANCE = 60000;
const ALLOW_WAITING = 10;
const logger = getLogger('health');

export class HealthService {
  private recordTargetHeight: number;
  private targetHeight: number;
  private blockTime = 6000;

  @OnEvent(IndexerEvent.BlockTarget)
  handleTargetBlock(blockPayload: TargetBlockPayload) {
    this.targetHeight = blockPayload.height;
    if (!this.recordTargetHeight) {
      this.recordTargetHeight = this.targetHeight;
    }
  }

  @OnEvent(IndexerEvent.NetworkMetadata)
  handleNetworkMetadata({ blockTime }: NetworkMetadataPayload): void {
    this.blockTime = blockTime;
  }

  @Interval(SAMPLING_TIME_VARIANCE)
  async endpointHealthCheck(): Promise<void> {
    if (this.blockTime * ALLOW_WAITING > SAMPLING_TIME_VARIANCE) {
      SAMPLING_TIME_VARIANCE = this.blockTime * ALLOW_WAITING;
    }
    if (!this.recordTargetHeight || !this.targetHeight) {
      await delay(5);
    } else {
      if (this.recordTargetHeight === this.targetHeight) {
        logger.warn(
          `The finalized block from this endpoint is not updating for ${
            SAMPLING_TIME_VARIANCE / 1000
          } secs`,
        );
      } else {
        this.recordTargetHeight = this.targetHeight;
      }
    }
  }
}
