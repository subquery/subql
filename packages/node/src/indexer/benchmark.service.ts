// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { OnEvent } from '@nestjs/event-emitter';
import * as moment from 'moment';
import 'moment-duration-format';
import { MetricPayload } from '../prometheus/types';
import { getLogger } from '../utils/logger';
import { delay } from '../utils/promise';
import { BlockPayload } from './types';

const SAMPLING_TIME_VARIANCE = 15;
const logger = getLogger('benchmark');

export class BenchmarkService {
  private currentProcessingHeight: number;
  private currentProcessingTimestamp: number;
  private targetHeight: number;
  private lastRegisteredHeight: number;
  private lastRegisteredTimestamp: number;
  private blockPerSecond: number;
  private needReset = true;

  async init(): Promise<void> {
    if (!this.currentProcessingHeight) {
      await delay(5);
    }
    setInterval(() => this.benchmark(), SAMPLING_TIME_VARIANCE * 1000);
  }

  private benchmark() {
    if (this.needReset) {
      this.resetBlock();
    } else {
      logger.debug(
        `current #${this.currentProcessingHeight}, last #${
          this.lastRegisteredHeight
        }, take ${
          (this.currentProcessingTimestamp - this.lastRegisteredTimestamp) /
          1000
        } secs`,
      );
      this.blockPerSecond =
        (this.currentProcessingHeight - this.lastRegisteredHeight) /
        ((this.currentProcessingTimestamp - this.lastRegisteredTimestamp) /
          1000);
      const duration = moment
        .duration(
          (this.targetHeight - this.currentProcessingHeight) *
            this.blockPerSecond,
          'seconds',
        )
        .format('D [days] HH [hours] MM [mins]');
      logger.info(
        `${this.blockPerSecond.toFixed(2)} bps, target: #${
          this.targetHeight
        }, current: #${
          this.currentProcessingHeight
        }, estimate time: ${duration}`,
      );
      this.resetBlock();
    }
  }

  private resetBlock(): void {
    this.lastRegisteredHeight = this.currentProcessingHeight;
    this.lastRegisteredTimestamp = this.currentProcessingTimestamp;
    this.needReset = false;
  }

  @OnEvent('block.processing')
  handleProcessingBlock(blockPayload: BlockPayload) {
    this.currentProcessingHeight = blockPayload.data.height;
    this.currentProcessingTimestamp = blockPayload.data.timestamp;
  }

  @OnEvent('metric.write')
  handleTargetBlock({ name, value }: MetricPayload) {
    if (name === 'subql_indexer_target_block_height') {
      this.targetHeight = value;
    }
  }
}
