// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import {findAvailablePort} from './utils';

describe('Utility', () => {
  describe('findAvailablePorts', () => {
    it('unbound port', async () => {
      expect(await findAvailablePort(1337)).toEqual(1337);
    });
    it('bound port', async () => {
      expect(await findAvailablePort(53)).toEqual(null);
    });
  });
});
