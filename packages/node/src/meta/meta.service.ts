// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Interval } from '@nestjs/schedule';
import {
  BaseMetaService,
  getLogger,
  NodeConfig,
  StoreCacheService,
} from '@subql/node-core';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: stellarSdkVersion } = require('stellar-sdk/package.json');
// eslint-disable-next-line @typescript-eslint/no-var-requires
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version: packageVersion } = require('../../package.json');
const logger = getLogger('profiler');

@Injectable()
export class MetaService extends BaseMetaService {
  private accEnqueueBlocks = 0;
  private accFetchBlocks = 0;
  private currentFilteringBlockNum = 0;
  private accRpcCalls = 0;
  private lastReportedFilteringBlockNum = 0;
  private lastReportedEnqueueBlocks = 0;
  private lastReportedFetchBlocks = 0;
  private lastReportedRpcCalls = 0;
  private lastStatsReportedTs: Date;

  constructor(
    private nodeConfig: NodeConfig,
    storeCacheService: StoreCacheService,
  ) {
    super(storeCacheService, nodeConfig);
  }

  protected packageVersion = packageVersion;
  protected sdkVersion(): { name: string; version: string } {
    return { name: 'stellarSdkVersion', version: stellarSdkVersion };
  }

  @OnEvent('enqueueBlocks')
  handleEnqueueBlocks(size: number): void {
    this.accEnqueueBlocks += size;
    if (!this.lastStatsReportedTs) {
      this.lastStatsReportedTs = new Date();
    }
  }

  @OnEvent('filteringBlocks')
  handleFilteringBlocks(height: number): void {
    this.currentFilteringBlockNum = height;
    if (!this.lastStatsReportedTs) {
      this.lastReportedFilteringBlockNum = height;
    }
  }

  @OnEvent('fetchBlock')
  handleFetchBlock(): void {
    this.accFetchBlocks++;
    if (!this.lastStatsReportedTs) {
      this.lastStatsReportedTs = new Date();
    }
  }

  @OnEvent('rpcCall')
  handleRpcCall(): void {
    this.accRpcCalls++;
    if (!this.lastStatsReportedTs) {
      this.lastStatsReportedTs = new Date();
    }
  }

  @Interval(10000)
  blockFilteringSpeed(): void {
    if (!this.nodeConfig.profiler) {
      return;
    }
    const count = this.accEnqueueBlocks - this.lastReportedEnqueueBlocks;
    this.lastReportedEnqueueBlocks = this.accEnqueueBlocks;
    const filteringCount =
      this.currentFilteringBlockNum - this.lastReportedFilteringBlockNum;
    const now = new Date();
    const timepass = now.getTime() - this.lastStatsReportedTs.getTime();
    this.lastStatsReportedTs = now;
    this.lastReportedFilteringBlockNum = this.currentFilteringBlockNum;
    const rpcCalls = this.accRpcCalls - this.lastReportedRpcCalls;
    this.lastReportedRpcCalls = this.accRpcCalls;
    const fetchCount = this.accFetchBlocks - this.lastReportedFetchBlocks;
    this.lastReportedFetchBlocks = this.accFetchBlocks;
    logger.info(`actual block filtering: ${(count / (timepass / 1000)).toFixed(
      2,
    )}/sec, \
seeming speed: ${(filteringCount / (timepass / 1000)).toFixed(
      2,
    )}/sec, rpcCalls: ${(rpcCalls / (timepass / 1000)).toFixed(2)}/sec \
fetch speed: ${(fetchCount / (timepass / 1000)).toFixed(2)}/sec`);
  }
}
