// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import detectPort from 'detect-port';

export async function findAvailablePort(startPort: number, range = 10): Promise<number> {
  for (let port = startPort; port <= startPort + range; port++) {
    try {
      const _port = await detectPort(port);
      if (_port === port) {
        return port;
      }
    } catch (e) {
      return null;
    }
  }

  return null;
}
