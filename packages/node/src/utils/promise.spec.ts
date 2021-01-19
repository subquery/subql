// Copyright 2020-2021 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { delay } from './promise';

it('utils.promise delay()', async () => {
  const start = new Date();
  await delay(1);
  const millsecDiff = new Date().getTime() - start.getTime();
  expect(millsecDiff).toBeGreaterThanOrEqual(1000);
  expect(millsecDiff).toBeLessThan(1050);
});
