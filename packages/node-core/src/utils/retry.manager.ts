// Copyright 2020-2023 SubQuery Pte Ltd authors & contributors
// SPDX-License-Identifier: GPL-3.0

import {Injectable, OnApplicationShutdown} from '@nestjs/common';

@Injectable()
export class RetryManager implements OnApplicationShutdown {
  private timeouts: NodeJS.Timeout[] = [];

  backoff(attempt: number): number {
    return Math.pow(2, attempt) * 1000; // Exponential backoff
  }

  retryWithBackoff<T>(
    tryFunction: () => Promise<T>,
    onError: (error: any) => void,
    onMaxAttempts: () => void,
    attempt = 0,
    maxAttempts = 5
  ): void {
    if (attempt >= maxAttempts) {
      onMaxAttempts();
    } else {
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      const timeout = setTimeout(async () => {
        try {
          await tryFunction();
        } catch (error) {
          onError(error);
          this.retryWithBackoff(tryFunction, onError, onMaxAttempts, attempt + 1, maxAttempts);
        }
      }, this.backoff(attempt));

      this.timeouts.push(timeout);
    }
  }

  onApplicationShutdown(): void {
    this.timeouts.forEach(clearTimeout);
    this.timeouts = [];
  }
}
