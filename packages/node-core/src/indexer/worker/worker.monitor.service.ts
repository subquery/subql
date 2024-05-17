// Copyright 2020-2024 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {isMainThread} from 'worker_threads';
import {Injectable} from '@nestjs/common';
import {MonitorServiceInterface} from '../monitor.service';

type HostMonitorService = {
  hostMonitorServiceWrite: (blockData: string) => void;
};

export const hostMonitorKeys: (keyof HostMonitorService)[] = ['hostMonitorServiceWrite'];

export function monitorHostFunctions(host: MonitorServiceInterface): HostMonitorService {
  return {
    hostMonitorServiceWrite: host.write.bind(host),
  };
}

@Injectable()
export class WorkerMonitorService {
  constructor(private host: HostMonitorService) {
    if (isMainThread) {
      throw new Error('Expected to be worker thread');
    }
  }

  write(blockData: string): void {
    return this.host.hostMonitorServiceWrite(blockData);
  }
}
