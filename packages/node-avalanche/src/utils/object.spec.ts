// Copyright 2020-2022 OnFinality Limited authors & contributors
// SPDX-License-Identifier: Apache-2.0

import { camelCaseObjectKey } from './object';

it('Convert objects key to camelCase', () => {
  const object = {
    entity: 'someEntity',
    active_for_auction: 'someAuction',
  };

  const result = camelCaseObjectKey(object);

  expect(result).toEqual({
    entity: 'someEntity',
    activeForAuction: 'someAuction',
  });
});
